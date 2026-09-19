pub mod agreement;
pub mod confusion;
pub mod dialect;
pub mod distractor;
pub mod punctuation;
pub mod repetition;
pub mod wordiness;

use crate::checker::{Checker, CheckerError};
use crate::types::{Category, CheckMode, Issue};

pub struct DeterministicChecker {
    pub enable_dialect: bool,
}

impl DeterministicChecker {
    pub fn new() -> Self {
        Self { enable_dialect: false }
    }

    pub fn with_dialect(enable_dialect: bool) -> Self {
        Self { enable_dialect }
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

    fn check(&self, text: &str, language: &str, _tag: isize, mode: CheckMode) -> Result<Vec<Issue>, CheckerError> {
        let mut issues = Vec::new();

        // 1. Distractor noun & Quantifier agreement
        issues.extend(distractor::check_distractor_noun_agreement(text));

        // 2. Demonstrative determiner-noun concord
        issues.extend(agreement::check_determiner_noun_agreement(text));

        // 3. Homophone / Confusion rules
        issues.extend(confusion::check_confusion_rules(text));

        // 4. Wordiness / Style rules
        issues.extend(wordiness::check_wordiness_rules(text));

        // 5. Repetition rules
        issues.extend(repetition::check_repetition_rules(text));

        // 6. Punctuation rules
        issues.extend(punctuation::check_punctuation_rules(text, language, mode));

        // 7. Dialect consistency (enabled in Document mode or when explicitly configured)
        let check_dialect = self.enable_dialect || mode == CheckMode::Document;
        issues.extend(dialect::check_dialect_consistency(text, check_dialect));

        // Sort by start offset
        issues.sort_by_key(|i| i.start_offset);

        Ok(issues)
    }
}
