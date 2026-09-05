use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

static DISTRACTOR_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(The|A|An|This|That|Every\s+one|Each|Neither|One)\s+(?:of\s+the\s+)?(?:(list|set|series|group|swarm|range|quality|collection|array|box|bunch|team|majority|percentage|type|kind|sort|amount|level|state|sample|batch|pair|bouquet|flow|sum|sound|shipment|expansion)\s+of\s+)(?:[a-zA-Z0-9_\-']+\s+){1,5}?(were|are|have)\b").expect("valid regex")
});

static QUANTIFIER_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(One|Each|Every\s+one|Neither)\s+of\s+(?:the\s+)?(?:[a-zA-Z0-9_\-']+\s+){1,5}?(were|are|have)\b").expect("valid regex")
});

pub fn check_distractor_noun_agreement(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    // 1. Distractor Head Nouns
    for mat in DISTRACTOR_REGEX.find_iter(text) {
        let matched = mat.as_str();
        let lower = matched.to_lowercase();

        // Exception: "A number of [plural] are...", "A variety of [plural] are..."
        if lower.starts_with("a number of") || lower.starts_with("a variety of") {
            continue;
        }

        // Exception: Relative clauses or infinitives in intervening phrase
        let words: Vec<&str> = matched.split_whitespace().collect();
        let has_rel_or_inf = words.iter().any(|w| {
            let lw = w.to_lowercase();
            lw == "which" || lw == "that" || lw == "who" || lw == "whom" || lw == "whose" || lw == "where" || lw == "when" || lw == "to"
        });
        if has_rel_or_inf {
            continue;
        }

        if let Some(last_word) = words.last() {
            let (fixed_verb, verb_len) = match last_word.to_lowercase().as_str() {
                "were" => ("was", 4),
                "are" => ("is", 3),
                "have" => ("has", 4),
                _ => continue,
            };

            let verb_start = mat.end() - verb_len;
            let verb_end = mat.end();

            issues.push(Issue {
                id: format!("distractor-noun-{}", mat.start()),
                rule_id: "grammar.distractor_noun_agreement".to_string(),
                category: Category::Grammar,
                severity: Severity::Error,
                message: format!("The singular head noun requires the singular verb '{}'.", fixed_verb),
                start_offset: verb_start,
                end_offset: verb_end,
                matched_text: last_word.to_string(),
                replacement: Some(fixed_verb.to_string()),
                suggestions: vec![fixed_verb.to_string()],
                apply_all_eligible: true,
            });
        }
    }

    // 2. Quantifier Heads
    for mat in QUANTIFIER_REGEX.find_iter(text) {
        let matched = mat.as_str();

        let words: Vec<&str> = matched.split_whitespace().collect();
        let has_rel_or_inf = words.iter().any(|w| {
            let lw = w.to_lowercase();
            lw == "which" || lw == "that" || lw == "who" || lw == "whom" || lw == "whose" || lw == "where" || lw == "when" || lw == "to"
        });
        if has_rel_or_inf {
            continue;
        }

        if let Some(last_word) = words.last() {
            let (fixed_verb, verb_len) = match last_word.to_lowercase().as_str() {
                "were" => ("was", 4),
                "are" => ("is", 3),
                "have" => ("has", 4),
                _ => continue,
            };

            let verb_start = mat.end() - verb_len;
            let verb_end = mat.end();

            issues.push(Issue {
                id: format!("quantifier-{}", mat.start()),
                rule_id: "grammar.quantifier_agreement".to_string(),
                category: Category::Grammar,
                severity: Severity::Error,
                message: format!("The singular quantifier requires the singular verb '{}'.", fixed_verb),
                start_offset: verb_start,
                end_offset: verb_end,
                matched_text: last_word.to_string(),
                replacement: Some(fixed_verb.to_string()),
                suggestions: vec![fixed_verb.to_string()],
                apply_all_eligible: true,
            });
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_distractor_noun_matches() {
        let text = "The list of registered participants were displayed.";
        let issues = check_distractor_noun_agreement(text);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].matched_text, "were");
        assert_eq!(issues[0].replacement, Some("was".to_string()));
    }

    #[test]
    fn test_distractor_exceptions() {
        let text = "A number of people are waiting outside.";
        let issues = check_distractor_noun_agreement(text);
        assert_eq!(issues.len(), 0);

        let text2 = "The sort of colour which it will seem to have";
        let issues2 = check_distractor_noun_agreement(text2);
        assert_eq!(issues2.len(), 0);
    }
}
