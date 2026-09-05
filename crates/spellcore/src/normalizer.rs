use crate::types::Issue;

/// Normalizes and deduplicates issues from multiple checkers.
///
/// Precedence rules (Fix C):
/// 1. Deterministic rules always win over native issues when spans overlap (e.g. `confusion.alot` overrides `native.spelling`).
/// 2. If two issues of the same type overlap, the wider or earlier span is preferred.
pub fn normalize_issues(mut deterministic_issues: Vec<Issue>, mut native_issues: Vec<Issue>) -> Vec<Issue> {
    // Sort deterministic issues by start offset
    deterministic_issues.sort_by_key(|i| (i.start_offset, i.end_offset));

    let mut result = Vec::new();

    // Add all deterministic issues
    for det_issue in deterministic_issues {
        result.push(det_issue);
    }

    // Filter native issues: drop any native issue that overlaps with an accepted deterministic issue
    for nat_issue in native_issues.drain(..) {
        let has_overlap = result.iter().any(|accepted| {
            !(nat_issue.end_offset <= accepted.start_offset || nat_issue.start_offset >= accepted.end_offset)
        });

        if !has_overlap {
            result.push(nat_issue);
        }
    }

    // Final sort by start offset
    result.sort_by_key(|i| (i.start_offset, i.end_offset));
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Category, Severity};

    #[test]
    fn test_precedence_deterministic_over_native() {
        let det = Issue {
            id: "det-alot".to_string(),
            rule_id: "confusion.alot".to_string(),
            category: Category::Spelling,
            severity: Severity::Error,
            message: "A lot is two words".to_string(),
            start_offset: 5,
            end_offset: 9,
            matched_text: "alot".to_string(),
            replacement: Some("a lot".to_string()),
            suggestions: vec!["a lot".to_string()],
            apply_all_eligible: true,
        };

        let nat = Issue {
            id: "nat-alot".to_string(),
            rule_id: "native.spelling".to_string(),
            category: Category::Spelling,
            severity: Severity::Error,
            message: "Possible misspelling".to_string(),
            start_offset: 5,
            end_offset: 9,
            matched_text: "alot".to_string(),
            replacement: Some("lot".to_string()), // Bad native replacement
            suggestions: vec!["lot".to_string()],
            apply_all_eligible: false,
        };

        let normalized = normalize_issues(vec![det], vec![nat]);
        assert_eq!(normalized.len(), 1);
        assert_eq!(normalized[0].rule_id, "confusion.alot");
        assert_eq!(normalized[0].replacement, Some("a lot".to_string()));
    }
}
