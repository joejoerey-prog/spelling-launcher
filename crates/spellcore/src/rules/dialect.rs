use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

static UK_ISE_WORDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-z]+)is(e|ed|ing|es|ation)\b").unwrap()
});

static US_IZE_WORDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-z]+)iz(e|ed|ing|es|ation)\b").unwrap()
});

static UK_OUR_WORDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(col|flav|hon|lab|arm|behav|glam|rum|neighb)our\b").unwrap()
});

static US_OR_WORDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(col|flav|hon|lab|arm|behav|glam|rum|neighb)or\b").unwrap()
});

pub fn check_dialect_consistency(text: &str, enabled: bool) -> Vec<Issue> {
    if !enabled {
        return Vec::new();
    }

    let mut issues = Vec::new();

    let mut uk_hits = Vec::new();
    let mut us_hits = Vec::new();

    for mat in UK_ISE_WORDS.find_iter(text) {
        let w = mat.as_str().to_lowercase();
        // Skip words that naturally end in -ise (promise, surprise, exercise, enterprise, etc.)
        if !w.starts_with("prom") && !w.starts_with("surpr") && !w.starts_with("exerc") && !w.starts_with("enterpr") && !w.starts_with("prais") {
            uk_hits.push((mat.start(), mat.end(), mat.as_str().to_string()));
        }
    }

    for mat in US_IZE_WORDS.find_iter(text) {
        let w = mat.as_str().to_lowercase();
        // Skip words that naturally end in -ize (size, prize, seize, etc.)
        if !w.starts_with("siz") && !w.starts_with("priz") && !w.starts_with("seiz") {
            us_hits.push((mat.start(), mat.end(), mat.as_str().to_string()));
        }
    }

    for mat in UK_OUR_WORDS.find_iter(text) {
        uk_hits.push((mat.start(), mat.end(), mat.as_str().to_string()));
    }

    for mat in US_OR_WORDS.find_iter(text) {
        us_hits.push((mat.start(), mat.end(), mat.as_str().to_string()));
    }

    // If both UK and US markers are present in the same document, flag the minority instances
    if !uk_hits.is_empty() && !us_hits.is_empty() {
        let flag_us = uk_hits.len() >= us_hits.len();
        let targets = if flag_us { &us_hits } else { &uk_hits };
        let dominant_dialect = if flag_us { "British English (-ise / -our)" } else { "American English (-ize / -or)" };

        for (start, end, word) in targets {
            issues.push(Issue {
                id: format!("dialect-consistency-{}", start),
                rule_id: "style.dialect_consistency".to_string(),
                category: Category::Style,
                severity: Severity::Suggestion, // Fix C: Suggestion severity
                message: format!(
                    "Mixed spelling convention detected. The document predominantly uses {}, but '{}' uses a different convention.",
                    dominant_dialect, word
                ),
                start_offset: *start,
                end_offset: *end,
                matched_text: word.clone(),
                replacement: None,
                suggestions: vec![],
                apply_all_eligible: false,
            });
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_disabled_by_default() {
        let text = "We organise the conference while they organize the meeting.";
        let issues = check_dialect_consistency(text, false);
        assert_eq!(issues.len(), 0);
    }

    #[test]
    fn test_mixed_dialect_detection() {
        let text = "We organise the event with great colour, but we also organize the schedule.";
        let issues = check_dialect_consistency(text, true);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].matched_text, "organize");
    }
}
