use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

static SINGULAR_DEM_PLURAL_NOUN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(that|this)\s+([a-zA-Z]+)\b").expect("valid regex")
});

static PLURAL_DEM_SINGULAR_NOUN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(those|these)\s+([a-zA-Z]+)\b").expect("valid regex")
});

const PLURAL_NOUNS: &[&str] = &[
    "issues", "problems", "items", "things", "points", "questions", "reasons",
    "results", "cases", "changes", "tasks", "errors", "bugs", "features",
    "users", "clients", "files", "days", "weeks", "months", "years", "documents",
    "rules", "guidelines", "words", "sentences", "numbers", "records", "actions",
    "decisions", "events", "factors", "options", "details", "steps", "examples",
    "methods", "requirements", "settings", "criteria", "people", "children",
];

const SINGULAR_NOUNS: &[&str] = &[
    "issue", "problem", "item", "thing", "point", "question", "reason",
    "result", "case", "change", "task", "error", "bug", "feature",
    "user", "client", "file", "document", "rule", "guideline", "record",
    "action", "decision", "event", "factor", "option", "detail", "step",
    "example", "method", "requirement", "setting",
];

fn match_capitalization(original: &str, replacement: &str) -> String {
    if original.starts_with(|c: char| c.is_uppercase()) {
        let mut chars = replacement.chars();
        match chars.next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        }
    } else {
        replacement.to_string()
    }
}

pub fn check_determiner_noun_agreement(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    // 1. Singular demonstrative (that, this) + plural noun -> plural demonstrative (those, these)
    for caps in SINGULAR_DEM_PLURAL_NOUN.captures_iter(text) {
        let dem_mat = caps.get(1).unwrap();
        let noun_mat = caps.get(2).unwrap();

        let dem_lower = dem_mat.as_str().to_lowercase();
        let noun_lower = noun_mat.as_str().to_lowercase();

        if PLURAL_NOUNS.contains(&noun_lower.as_str()) {
            let plural_dem = match dem_lower.as_str() {
                "that" => "those",
                "this" => "these",
                _ => continue,
            };

            let rep = match_capitalization(dem_mat.as_str(), plural_dem);
            let singular_noun = noun_lower.trim_end_matches('s');
            let alt_suggestion = format!("{} {}", dem_mat.as_str(), singular_noun);

            issues.push(Issue {
                id: format!("determiner_agreement_{}", dem_mat.start()),
                rule_id: "grammar.determiner_noun_agreement".to_string(),
                category: Category::Grammar,
                severity: Severity::Error,
                message: format!(
                    "The plural noun '{}' requires the plural demonstrative '{}'.",
                    noun_mat.as_str(),
                    rep
                ),
                start_offset: dem_mat.start(),
                end_offset: dem_mat.end(),
                matched_text: dem_mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep, alt_suggestion],
                apply_all_eligible: true,
            });
        }
    }

    // 2. Plural demonstrative (those, these) + singular noun -> singular demonstrative (that, this)
    for caps in PLURAL_DEM_SINGULAR_NOUN.captures_iter(text) {
        let dem_mat = caps.get(1).unwrap();
        let noun_mat = caps.get(2).unwrap();

        let dem_lower = dem_mat.as_str().to_lowercase();
        let noun_lower = noun_mat.as_str().to_lowercase();

        if SINGULAR_NOUNS.contains(&noun_lower.as_str()) {
            let singular_dem = match dem_lower.as_str() {
                "those" => "that",
                "these" => "this",
                _ => continue,
            };

            let rep = match_capitalization(dem_mat.as_str(), singular_dem);
            let alt_suggestion = format!("{} {}s", dem_mat.as_str(), noun_mat.as_str());

            issues.push(Issue {
                id: format!("determiner_agreement_{}", dem_mat.start()),
                rule_id: "grammar.determiner_noun_agreement".to_string(),
                category: Category::Grammar,
                severity: Severity::Error,
                message: format!(
                    "The singular noun '{}' requires the singular demonstrative '{}'.",
                    noun_mat.as_str(),
                    rep
                ),
                start_offset: dem_mat.start(),
                end_offset: dem_mat.end(),
                matched_text: dem_mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep, alt_suggestion],
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
    fn test_singular_dem_plural_noun() {
        let text = "We need to fix that issues immediately.";
        let issues = check_determiner_noun_agreement(text);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].matched_text, "that");
        assert_eq!(issues[0].replacement, Some("those".to_string()));

        let text2 = "Look at this problems here.";
        let issues2 = check_determiner_noun_agreement(text2);
        assert_eq!(issues2.len(), 1);
        assert_eq!(issues2[0].matched_text, "this");
        assert_eq!(issues2[0].replacement, Some("these".to_string()));
    }

    #[test]
    fn test_plural_dem_singular_noun() {
        let text = "We should investigate those issue right away.";
        let issues = check_determiner_noun_agreement(text);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].matched_text, "those");
        assert_eq!(issues[0].replacement, Some("that".to_string()));

        let text2 = "These problem was noted.";
        let issues2 = check_determiner_noun_agreement(text2);
        assert_eq!(issues2.len(), 1);
        assert_eq!(issues2[0].matched_text, "These");
        assert_eq!(issues2[0].replacement, Some("This".to_string()));
    }

    #[test]
    fn test_no_false_positives_on_verbs() {
        let text = "Those include several factors.";
        let issues = check_determiner_noun_agreement(text);
        assert!(issues.is_empty());

        let text2 = "That explains everything.";
        let issues2 = check_determiner_noun_agreement(text2);
        assert!(issues2.is_empty());
    }
}
