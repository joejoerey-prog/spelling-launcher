use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

static DUPLICATE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(the\s+the|to\s+to|in\s+in|on\s+on|at\s+at|of\s+of|is\s+is|and\s+and)\b").unwrap()
});

pub fn check_repetition_rules(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    for mat in DUPLICATE_REGEX.find_iter(text) {
        let matched = mat.as_str();
        let single_word = matched.split_whitespace().next().unwrap_or(matched);
        issues.push(Issue {
            id: format!("repetition-duplicate-{}", mat.start()),
            rule_id: "repetition.duplicate_words".to_string(),
            category: Category::Repetition,
            severity: Severity::Error,
            message: format!("Possible repeated word: '{}'.", single_word),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: matched.to_string(),
            replacement: Some(single_word.to_string()),
            suggestions: vec![single_word.to_string()],
            apply_all_eligible: true,
        });
    }

    issues
}
