pub mod confusion;
pub mod distractor;
pub mod punctuation;
pub mod repetition;
pub mod wordiness;

use crate::checker::{Checker, CheckerError};
use crate::types::{Category, Issue};

pub struct DeterministicChecker;

impl DeterministicChecker {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DeterministicChecker {
    fn default() -> Self {
        Self::new()
    }
}

impl Checker for DeterministicChecker {
    fn name(&self) -> &'static str {
        "deterministic_rules"
    }

    fn categories(&self) -> &[Category] {
        &[
            Category::Grammar,
            Category::Spelling,
            Category::Style,
            Category::Repetition,
            Category::Punctuation,
        ]
    }

    fn check(&self, text: &str, _language: &str, _tag: isize) -> Result<Vec<Issue>, CheckerError> {
        let mut issues = Vec::new();

        // 1. Distractor noun & Quantifier agreement
        issues.extend(distractor::check_distractor_noun_agreement(text));

        // 2. Homophone / Confusion rules
        issues.extend(confusion::check_confusion_rules(text));

        // 3. Wordiness / Style rules
        issues.extend(wordiness::check_wordiness_rules(text));

        // 4. Repetition rules
        issues.extend(repetition::check_repetition_rules(text));

        // 5. Punctuation rules
        issues.extend(punctuation::check_punctuation_rules(text));

        // Sort by start offset
        issues.sort_by_key(|i| i.start_offset);

        Ok(issues)
    }
}
