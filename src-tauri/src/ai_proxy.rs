use std::time::Instant;
use reqwest::Client;
use serde_json::json;
use crate::models::{RewritePassageRequest, RewritePassageResponse};

/// Robustly extracts JSON array or bullet lines from LLM response text
pub fn extract_variations_from_text(raw: &str) -> Vec<String> {
    let mut text = raw.trim().to_string();

    // Strip <think> ... </think> reasoning blocks if present
    if text.contains("<think>") {
        if let Some(end_idx) = text.find("</think>") {
            text = text[end_idx + 8..].trim().to_string();
        }
    }

    // Strip markdown code fences ```json ... ```
    if text.starts_with("```") {
        let lines: Vec<&str> = text.lines().collect();
        if lines.len() >= 2 {
            text = lines[1..lines.len() - 1].join("\n").trim().to_string();
        }
    }

    // Attempt direct JSON array parsing
    if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&text) {
        let clean: Vec<String> = parsed
            .into_iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !clean.is_empty() {
            return clean;
        }
    }

    // Find JSON array substring e.g. ["...", "..."]
    if let Some(start) = text.find('[') {
        if let Some(end) = text.rfind(']') {
            if end > start {
                let slice = &text[start..=end];
                if let Ok(parsed) = serde_json::from_str::<Vec<String>>(slice) {
                    let clean: Vec<String> = parsed
                        .into_iter()
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    if !clean.is_empty() {
                        return clean;
                    }
                }
            }
        }
    }

    // Fallback: parse numbered or bulleted lines
    text.lines()
        .map(|l| {
            l.trim()
                .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.' || c == '-' || c == '*' || c == ' ')
                .trim_matches('"')
                .trim_matches('\'')
                .trim()
                .to_string()
        })
        .filter(|l| !l.is_empty() && !l.starts_with('[') && !l.starts_with(']'))
        .collect()
}

/// System prompt, user prompt and temperature for a rewrite request.
/// Without `mode` this is the plain single-sentence rewrite, unchanged.
pub fn build_prompts(req: &RewritePassageRequest, text: &str) -> (String, String, f64) {
    let tone_instruction = match req.tone.to_lowercase().as_str() {
        "casual" => "Make it relaxed, conversational, friendly, and natural.",
        "professional" => "Make it polished, formal, and articulate for professional communication.",
        "academic" => "Make it rigorous, scholarly, and articulate with elevated vocabulary.",
        "confident" => "Make it assertive, direct, and authoritative without weak qualifiers.",
        "friendly" => "Make it warm, inviting, and empathetic.",
        "direct" => "Make it extremely concise, punchy, and straightforward.",
        _ => "Improve fluency and expressiveness.",
    };

    let length_instruction = match req.length.to_lowercase().as_str() {
        "shorten" => "Make the rewrites significantly shorter, cutting fluff.",
        "expand" => "Expand the sentence with more rich detail, nuance, and clarity.",
        _ => "Keep approximately the same length.",
    };

    let mode = match req.mode.as_deref() {
        Some(m @ ("suggest" | "polish")) => m,
        _ => {
            let prompt = format!(
                r#"Rewrite the following single sentence into 4 high-quality, diverse variations.

Source sentence:
"{}"

Style guidelines:
- Tone: {}
- Length: {}
- Goal: {}
- Preserve formatting tags if present.
- Output ONLY a JSON array of 4 strings with no code fences and no conversational filler.
Format: ["Variation 1", "Variation 2", "Variation 3", "Variation 4"]"#,
                text, tone_instruction, length_instruction, req.goal
            );
            return (
                "You are a concise sentence rewriting assistant. You must output only a valid JSON array of 4 strings."
                    .to_string(),
                prompt,
                0.7,
            );
        }
    };

    let spelling = match req.dialect.as_deref() {
        Some("en_US") => "- Spelling: American English (-ize, -or). Do not switch to British spellings.\n",
        Some("en_GB") => "- Spelling: British English (-ise, -our). Do not switch to American spellings.\n",
        _ => "",
    };
    let terms = req
        .protected_terms
        .as_ref()
        .map(|t| t.iter().filter(|w| !w.trim().is_empty()).take(50).cloned().collect::<Vec<_>>())
        .filter(|t| !t.is_empty())
        .map(|t| format!("- Copy these terms exactly if they appear: {}.\n", t.join(", ")))
        .unwrap_or_default();
    let context = req
        .context
        .as_deref()
        .map(str::trim)
        .filter(|c| !c.is_empty())
        .map(|c| format!("\nParagraph it comes from (for meaning only; do not rewrite it):\n\"{}\"\n", c))
        .unwrap_or_default();
    let rules = format!(
        "- Keep text inside quotation marks, code in backticks, URLs, email addresses, line breaks and list or heading markers exactly as written.\n{}{}- Do not add a capital letter or full stop at the start or end that the highlighted text does not have.\n",
        spelling, terms
    );

    if mode == "polish" {
        let prompt = format!(
            r#"Polish the highlighted text below with the smallest edit that works.

Highlighted text:
"{}"
{}
Rules:
- Fix only clear mistakes in spelling, grammar and punctuation, and cut obvious filler.
- Do not change the meaning, voice, tone or word choice otherwise.
- If it is already good, return it unchanged.
{}- Output ONLY a JSON array with exactly 1 string, with no code fences and no conversational filler.
Format: ["Polished text"]"#,
            text, context, rules
        );
        return (
            "You are a careful copy editor. You must output only a valid JSON array of 1 string.".to_string(),
            prompt,
            0.2,
        );
    }

    let prompt = format!(
        r#"Write 4 diverse replacement options for the highlighted text below, best option first.

Highlighted text:
"{}"
{}
Rules:
- Each option replaces ONLY the highlighted text and must fit the paragraph where it stands.
- Tone: {}
- Length: {}
- Goal: {}
{}- Output ONLY a JSON array of 4 strings with no code fences and no conversational filler.
Format: ["Option 1", "Option 2", "Option 3", "Option 4"]"#,
        text, context, tone_instruction, length_instruction, req.goal, rules
    );
    (
        "You are a concise rewriting assistant. You must output only a valid JSON array of 4 strings.".to_string(),
        prompt,
        0.7,
    )
}

/// Securely rewrites ONLY the provided selected passage via Local Ollama or OpenAI-compatible API.
pub async fn rewrite_passage_api(
    req: RewritePassageRequest,
) -> Result<RewritePassageResponse, String> {
    let start = Instant::now();
    let text = req.text.trim();
    if text.is_empty() {
        return Err("Cannot rewrite empty passage".to_string());
    }
    // Built first: the fields below are moved out of `req` one by one.
    let (system_prompt, prompt, temperature) = build_prompts(&req, text);

    let base_url = req
        .base_url
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_else(|| "http://localhost:11434/v1".to_string());

    let is_ollama = base_url.contains("11434") || base_url.contains("ollama");

    let model = req
        .model
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| {
            if is_ollama {
                "llama3.2:3b".to_string()
            } else {
                "gpt-4o-mini".to_string()
            }
        });

    let api_key = req.api_key.unwrap_or_default();

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let primary_endpoint = if base_url.ends_with("/v1") || base_url.ends_with("/v1/") {
        format!("{}/chat/completions", base_url.trim_end_matches('/'))
    } else if base_url.ends_with("/chat/completions") {
        base_url.clone()
    } else {
        format!("{}/v1/chat/completions", base_url.trim_end_matches('/'))
    };

    let mut candidate_endpoints = vec![primary_endpoint.clone()];
    if primary_endpoint.contains("localhost:11434") {
        candidate_endpoints.push(primary_endpoint.replace("localhost:11434", "127.0.0.1:11434"));
    } else if primary_endpoint.contains("127.0.0.1:11434") {
        candidate_endpoints.push(primary_endpoint.replace("127.0.0.1:11434", "localhost:11434"));
    }

    let payload = json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": temperature,
        "max_tokens": 800
    });

    let mut last_err = String::new();
    let mut maybe_res = None;

    for endpoint in &candidate_endpoints {
        let mut req_builder = client.post(endpoint).json(&payload);
        if !api_key.is_empty() {
            req_builder = req_builder.bearer_auth(&api_key);
        }

        match req_builder.send().await {
            Ok(r) => {
                maybe_res = Some((r, endpoint.clone()));
                break;
            }
            Err(e) => {
                last_err = format!("Connection to Ollama ({}) failed: {}. Make sure Ollama is running.", endpoint, e);
            }
        }
    }

    // If initial candidates failed, wait 400ms and try primary once more (handles wake from sleep or model load)
    if maybe_res.is_none() {
        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        for endpoint in &candidate_endpoints {
            let mut req_builder = client.post(endpoint).json(&payload);
            if !api_key.is_empty() {
                req_builder = req_builder.bearer_auth(&api_key);
            }
            if let Ok(r) = req_builder.send().await {
                maybe_res = Some((r, endpoint.clone()));
                break;
            }
        }
    }

    let (res, _used_endpoint) = match maybe_res {
        Some(pair) => pair,
        None => return Err(last_err),
    };

    let status = res.status();
    if !status.is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Ollama/API returned error {}: {}", status, err_text));
    }

    let res_json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    let raw_content = res_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim();

    let variations = extract_variations_from_text(raw_content);

    let latency = start.elapsed().as_millis() as u64;

    Ok(RewritePassageResponse {
        variations,
        latency_ms: latency,
        provider: format!("Ollama ({})", model),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_variations_json() {
        let input = r#"["First rewrite", "Second rewrite", "Third rewrite"]"#;
        let res = extract_variations_from_text(input);
        assert_eq!(res.len(), 3);
        assert_eq!(res[0], "First rewrite");
    }

    #[test]
    fn test_extract_variations_with_markdown_fences() {
        let input = "```json\n[\n  \"Alpha variation.\",\n  \"Beta variation.\"\n]\n```";
        let res = extract_variations_from_text(input);
        assert_eq!(res.len(), 2);
        assert_eq!(res[0], "Alpha variation.");
    }

    #[test]
    fn test_extract_variations_lines_fallback() {
        let input = "1. First sentence\n2. Second sentence\n3. Third sentence";
        let res = extract_variations_from_text(input);
        assert_eq!(res.len(), 3);
        assert_eq!(res[0], "First sentence");
    }

    fn request(mode: Option<&str>) -> RewritePassageRequest {
        RewritePassageRequest {
            text: "teh quick fox".into(),
            tone: "natural".into(),
            length: "same".into(),
            goal: "clarity".into(),
            api_key: None,
            base_url: None,
            model: None,
            mode: mode.map(str::to_string),
            context: Some("The teh quick fox ran home.".into()),
            dialect: Some("en_GB".into()),
            protected_terms: Some(vec!["Acme".into(), " ".into()]),
        }
    }

    #[test]
    fn plain_rewrite_prompt_ignores_selection_fields() {
        let (system, prompt, temp) = build_prompts(&request(None), "teh quick fox");
        assert!(system.contains("sentence rewriting assistant"));
        assert!(prompt.starts_with("Rewrite the following single sentence into 4"));
        assert!(!prompt.contains("Paragraph it comes from"));
        assert!(!prompt.contains("Acme"));
        assert_eq!(temp, 0.7);
    }

    #[test]
    fn suggest_prompt_carries_context_dialect_and_protected_terms() {
        let (_, prompt, temp) = build_prompts(&request(Some("suggest")), "teh quick fox");
        assert!(prompt.contains("4 diverse replacement options"));
        assert!(prompt.contains("The teh quick fox ran home."));
        assert!(prompt.contains("British English (-ise, -our)"));
        assert!(prompt.contains("Copy these terms exactly if they appear: Acme."));
        assert!(prompt.contains("quotation marks, code in backticks"));
        assert_eq!(temp, 0.7);
    }

    #[test]
    fn polish_prompt_asks_for_one_conservative_edit() {
        let (system, prompt, temp) = build_prompts(&request(Some("polish")), "teh quick fox");
        assert!(system.contains("JSON array of 1 string"));
        assert!(prompt.contains("smallest edit"));
        assert!(prompt.contains("return it unchanged"));
        assert!(prompt.contains("exactly 1 string"));
        assert!(temp < 0.5);
    }

    #[test]
    fn unknown_mode_falls_back_to_the_plain_rewrite() {
        let (_, prompt, _) = build_prompts(&request(Some("other")), "teh quick fox");
        assert!(prompt.starts_with("Rewrite the following single sentence into 4"));
    }
}
