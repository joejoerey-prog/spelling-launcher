use crate::cache::SharedCache;
use crate::checker::Checker;
use crate::native::NativeChecker;
use crate::normalizer::normalize_issues;
use crate::rules::DeterministicChecker;
use crate::types::Issue;
use objc2_app_kit::NSSpellChecker;
use std::sync::Arc;

pub struct SpellcoreEngine {
    checkers: Vec<Arc<dyn Checker>>,
    cache: Arc<SharedCache>,
}

impl SpellcoreEngine {
    pub fn new() -> Self {
        let mut engine = Self {
            checkers: Vec::new(),
            cache: Arc::new(SharedCache::new()),
        };
        // Default Strategy H: Deterministic + Native
        engine.register_checker(Arc::new(DeterministicChecker::new()));
        engine.register_checker(Arc::new(NativeChecker::new()));
        engine
    }

    pub fn with_cache(cache: Arc<SharedCache>) -> Self {
        let mut engine = Self {
            checkers: Vec::new(),
            cache,
        };
        engine.register_checker(Arc::new(DeterministicChecker::new()));
        engine.register_checker(Arc::new(NativeChecker::new()));
        engine
    }

    pub fn cache(&self) -> Arc<SharedCache> {
        self.cache.clone()
    }

    pub fn bump_dictionary_revision(&self) -> u64 {
        self.cache.bump_revision()
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

    /// Check text with all registered checkers and apply precedence normalization.
    pub fn check(&self, text: &str, language: &str, tag: isize, mode: crate::types::CheckMode) -> Vec<Issue> {
        let masked_spans = crate::masker::SyntaxMasker::find_masked_spans(text);
        let masked_text = if masked_spans.is_empty() {
            None
        } else {
            Some(crate::masker::SyntaxMasker::mask_text(text))
        };

        let mut deterministic_issues = Vec::new();
        let mut native_issues = Vec::new();

        for checker in &self.checkers {
            let text_to_check = if checker.name() == "native_spellchecker" {
                masked_text.as_deref().unwrap_or(text)
            } else {
                text
            };

            if let Ok(issues) = checker.check(text_to_check, language, tag, mode) {
                if checker.name() == "deterministic_rules" {
                    deterministic_issues.extend(issues);
                } else {
                    native_issues.extend(issues);
                }
            }
        }

        // Exclude any issues that fall within masked spans (code blocks, inline backticks, URLs, emails, identifiers)
        if !masked_spans.is_empty() {
            deterministic_issues.retain(|issue| {
                !crate::masker::SyntaxMasker::overlaps_masked(&masked_spans, issue.start_offset, issue.end_offset)
            });
            native_issues.retain(|issue| {
                !crate::masker::SyntaxMasker::overlaps_masked(&masked_spans, issue.start_offset, issue.end_offset)
            });
        }

        normalize_issues(deterministic_issues, native_issues)
    }

    /// Check full document text with all registered checkers and apply precedence normalization.
    pub fn check_document(&self, text: &str, language: &str, tag: isize) -> Vec<Issue> {
        self.check(text, language, tag, crate::types::CheckMode::Document)
    }

    /// Check a short text fragment (e.g. Raycast selection) with fragment-specific heuristics.
    pub fn check_fragment(&self, text: &str, language: &str, tag: isize) -> Vec<Issue> {
        self.check(text, language, tag, crate::types::CheckMode::Fragment)
    }

    /// Check a single dirty paragraph using the LRU cache to avoid re-checking unchanged paragraphs.
    pub fn check_paragraph(&self, paragraph_text: &str, paragraph_offset: usize, language: &str, tag: isize) -> Vec<Issue> {
        let cached = self.cache.get(paragraph_text, language, crate::types::CheckMode::Document);
        let mut issues = match cached {
            Some(hit) => hit,
            None => {
                let computed = self.check(paragraph_text, language, tag, crate::types::CheckMode::Document);
                self.cache.insert(paragraph_text, language, crate::types::CheckMode::Document, computed.clone());
                computed
            }
        };

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
