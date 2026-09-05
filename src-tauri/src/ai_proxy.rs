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

/// Securely rewrites ONLY the provided selected passage via Local Ollama or OpenAI-compatible API.
pub async fn rewrite_passage_api(
    req: RewritePassageRequest,
) -> Result<RewritePassageResponse, String> {
    let start = Instant::now();
    let text = req.text.trim();
    if text.is_empty() {
        return Err("Cannot rewrite empty passage".to_string());
    }

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
                "qwen2.5vl:latest".to_string()
            } else {
                "gpt-4o-mini".to_string()
            }
        });

    let api_key = req.api_key.unwrap_or_default();

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
                "content": "You are a concise sentence rewriting assistant. You must output only a valid JSON array of 4 strings."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
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
}
