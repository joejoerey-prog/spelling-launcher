use crate::checker::Checker;
use crate::native::NativeChecker;
use crate::normalizer::normalize_issues;
use crate::rules::DeterministicChecker;
use crate::types::Issue;
use objc2_app_kit::NSSpellChecker;
use std::sync::Arc;

pub struct SpellcoreEngine {
    checkers: Vec<Arc<dyn Checker>>,
}

impl SpellcoreEngine {
    pub fn new() -> Self {
        let mut engine = Self { checkers: Vec::new() };
        // Default Strategy H: Deterministic + Native
        engine.register_checker(Arc::new(DeterministicChecker::new()));
        engine.register_checker(Arc::new(NativeChecker::new()));
        engine
    }

    /// Register a custom or modular checker (e.g. for future extensions).
    pub fn register_checker(&mut self, checker: Arc<dyn Checker>) {
        self.checkers.push(checker);
    }

    /// Allocate a unique document tag from NSSpellChecker.
    pub fn create_document_tag() -> isize {
        NSSpellChecker::uniqueSpellDocumentTag()
    }

    /// Close and release a document tag in NSSpellChecker.
    pub fn close_document_tag(tag: isize) {
        let checker = NSSpellChecker::sharedSpellChecker();
        checker.closeSpellDocumentWithTag(tag);
    }

    /// Check full document text with all registered checkers and apply precedence normalization.
    pub fn check_document(&self, text: &str, language: &str, tag: isize) -> Vec<Issue> {
        let mut deterministic_issues = Vec::new();
        let mut native_issues = Vec::new();

        for checker in &self.checkers {
            if let Ok(issues) = checker.check(text, language, tag) {
                if checker.name() == "deterministic_rules" {
                    deterministic_issues.extend(issues);
                } else {
                    native_issues.extend(issues);
                }
            }
        }

        normalize_issues(deterministic_issues, native_issues)
    }

    /// Check a single dirty paragraph and adjust issue offsets relative to document start.
    pub fn check_paragraph(&self, paragraph_text: &str, paragraph_offset: usize, language: &str, tag: isize) -> Vec<Issue> {
        let mut issues = self.check_document(paragraph_text, language, tag);
        for issue in &mut issues {
            issue.start_offset += paragraph_offset;
            issue.end_offset += paragraph_offset;
        }
        issues
    }
}

impl Default for SpellcoreEngine {
    fn default() -> Self {
        Self::new()
    }
}
