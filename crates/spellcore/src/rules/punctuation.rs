use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

static SPACE_BEFORE_COMMA: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\s+,").unwrap()
});

static MISSING_SPACE_AFTER_COMMA: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r",([A-Za-z])").unwrap()
});

pub fn check_punctuation_rules(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    for mat in SPACE_BEFORE_COMMA.find_iter(text) {
        issues.push(Issue {
            id: format!("punct-space-before-comma-{}", mat.start()),
            rule_id: "punctuation.space_before_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Unexpected whitespace before comma.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(",".to_string()),
            suggestions: vec![",".to_string()],
            apply_all_eligible: true,
        });
    }

    for caps in MISSING_SPACE_AFTER_COMMA.captures_iter(text) {
        if let Some(mat) = caps.get(0) {
            let next_char = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let rep = format!(", {}", next_char);
            issues.push(Issue {
                id: format!("punct-missing-space-after-comma-{}", mat.start()),
                rule_id: "punctuation.missing_space_after_comma".to_string(),
                category: Category::Punctuation,
                severity: Severity::Warning,
                message: "Missing whitespace after comma.".to_string(),
                start_offset: mat.start(),
                end_offset: mat.end(),
                matched_text: mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: true,
            });
        }
    }

    issues
}
