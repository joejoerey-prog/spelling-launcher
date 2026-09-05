use crate::checker::{Checker, CheckerError};
use crate::types::{utf16_range_to_utf8_offsets, Category, Issue, Severity};
use objc2::msg_send;
use objc2::runtime::AnyObject;
use objc2_app_kit::NSSpellChecker;
use objc2_foundation::{
    ns_string, NSArray, NSRange, NSString, NSTextCheckingType,
};
use std::collections::{BTreeMap, HashSet};

extern "C" {
    fn pthread_main_np() -> i32;
    fn dispatch_sync_f(
        queue: *mut std::ffi::c_void,
        context: *mut std::ffi::c_void,
        work: extern "C" fn(*mut std::ffi::c_void),
    );
    static mut _dispatch_main_q: std::ffi::c_void;
}

fn run_on_main_thread<F, R>(f: F) -> R
where
    F: FnOnce() -> R + Send,
    R: Send,
{
    let is_main = unsafe { pthread_main_np() != 0 };
    if is_main {
        f()
    } else {
        struct ClosureContext<F, R> {
            func: Option<F>,
            result: Option<R>,
        }

        extern "C" fn trampoline<F, R>(context: *mut std::ffi::c_void)
        where
            F: FnOnce() -> R + Send,
            R: Send,
        {
            let ctx = unsafe { &mut *(context as *mut ClosureContext<F, R>) };
            if let Some(func) = ctx.func.take() {
                ctx.result = Some(func());
            }
        }

        let mut context = ClosureContext {
            func: Some(f),
            result: None,
        };

        unsafe {
            let queue = &raw mut _dispatch_main_q as *mut std::ffi::c_void;
            let ctx_ptr = (&raw mut context) as *mut std::ffi::c_void;
            dispatch_sync_f(queue, ctx_ptr, trampoline::<F, R>);
        }

        context.result.expect("trampoline must have executed")
    }
}

pub struct NativeChecker;

impl NativeChecker {
    pub fn new() -> Self {
        Self
    }
}

impl Default for NativeChecker {
    fn default() -> Self {
        Self::new()
    }
}

impl Checker for NativeChecker {
    fn name(&self) -> &'static str {
        "native_spellchecker"
    }

    fn categories(&self) -> &[Category] {
        &[Category::Spelling, Category::Grammar]
    }

    fn check(&self, text: &str, language: &str, tag: isize) -> Result<Vec<Issue>, CheckerError> {
        let text_string = text.to_string();
        let lang_string = language.to_string();

        run_on_main_thread(move || {
            let checker = NSSpellChecker::sharedSpellChecker();
            checker.setAutomaticallyIdentifiesLanguages(false);

            let primary_lang = if lang_string == "en_US" {
                ns_string!("en_US")
            } else {
                ns_string!("en_GB")
            };
            let secondary_lang = if lang_string == "en_US" {
                ns_string!("en_GB")
            } else {
                ns_string!("en_US")
            };

            let ns_str = NSString::from_str(&text_string);
            let full_range = NSRange::new(0, ns_str.length());

            // Fix B: Count capitalized words for proper noun heuristic
            let mut proper_noun_counts: BTreeMap<String, usize> = BTreeMap::new();
            for word in text_string.split_whitespace() {
                let clean: String = word.trim_matches(|c: char| !c.is_alphabetic()).to_string();
                if clean.len() > 1 && clean.chars().next().map_or(false, |c| c.is_uppercase()) {
                    *proper_noun_counts.entry(clean).or_insert(0) += 1;
                }
            }

            let types = NSTextCheckingType::Spelling.0 | NSTextCheckingType::Grammar.0 | NSTextCheckingType::Correction.0;

            // 1. Check with primary language
            checker.setLanguage(primary_lang);
            let results_primary = unsafe {
                checker.checkString_range_types_options_inSpellDocumentWithTag_orthography_wordCount(
                    &ns_str,
                    full_range,
                    types,
                    None,
                    tag,
                    None,
                    std::ptr::null_mut(),
                )
            };

            // 2. Check with secondary language for dual-dictionary agreement (Fix B)
            checker.setLanguage(secondary_lang);
            let results_secondary = unsafe {
                checker.checkString_range_types_options_inSpellDocumentWithTag_orthography_wordCount(
                    &ns_str,
                    full_range,
                    types,
                    None,
                    tag,
                    None,
                    std::ptr::null_mut(),
                )
            };

            // Reset language to primary
            checker.setLanguage(primary_lang);

            let mut secondary_spelling_ranges: HashSet<(usize, usize)> = HashSet::new();
            for r in results_secondary.iter() {
                if r.resultType() == NSTextCheckingType::Spelling {
                    let range = r.range();
                    secondary_spelling_ranges.insert((range.location, range.length));
                }
            }

            let mut issues = Vec::new();

            for r in results_primary.iter() {
                let r_type = r.resultType();
                let r_range = r.range();

                if r_type == NSTextCheckingType::Spelling {
                    // Fix B: Dual-dictionary agreement
                    // Word is only misspelled if flagged in BOTH dictionaries!
                    if !secondary_spelling_ranges.contains(&(r_range.location, r_range.length)) {
                        continue; // Suppressed: valid Oxford / American variant
                    }

                    let sub = ns_str.substringWithRange(r_range).to_string();

                    // Fix B: Proper noun heuristic
                    let clean_sub: String = sub.trim_matches(|c: char| !c.is_alphabetic()).to_string();
                    let is_capitalized = clean_sub.chars().next().map_or(false, |c| c.is_uppercase());
                    let occurrences = proper_noun_counts.get(&clean_sub).copied().unwrap_or(0);
                    if is_capitalized && occurrences >= 2 {
                        continue; // Suppressed: recurring proper noun
                    }

                    let (start_byte, end_byte) = match utf16_range_to_utf8_offsets(&text_string, r_range.location, r_range.length) {
                        Some(offsets) => offsets,
                        None => continue,
                    };

                    let guesses = checker.guessesForWordRange_inString_language_inSpellDocumentWithTag(
                        r_range,
                        &ns_str,
                        Some(primary_lang),
                        tag,
                    );

                    let suggestions: Vec<String> = guesses
                        .map(|arr| arr.iter().map(|s| s.to_string()).collect())
                        .unwrap_or_default();

                    let top_guess = suggestions.first().cloned();

                    issues.push(Issue {
                        id: format!("native-spelling-{}", start_byte),
                        rule_id: "native.spelling".to_string(),
                        category: Category::Spelling,
                        severity: Severity::Error,
                        message: format!("Possible misspelling: '{}'.", sub),
                        start_offset: start_byte,
                        end_offset: end_byte,
                        matched_text: sub,
                        replacement: top_guess,
                        suggestions,
                        apply_all_eligible: true, // Eligible under dual-dict agreement (>95% accuracy)
                    });
                } else if r_type == NSTextCheckingType::Grammar {
                    let _sub = ns_str.substringWithRange(r_range).to_string();
                    let mut desc = None;
                    let mut suggestions: Vec<String> = Vec::new();
                    let mut err_range = r_range;

                    if let Some(details) = r.grammarDetails() {
                        for d in details.iter() {
                            let desc_key = ns_string!("NSGrammarUserDescription");
                            let corr_key = ns_string!("NSGrammarCorrections");
                            let range_key = ns_string!("NSGrammarRange");

                            if let Some(desc_obj) = d.objectForKey(desc_key) {
                                let desc_str: &NSString = unsafe { &*(&*desc_obj as *const AnyObject as *const NSString) };
                                desc = Some(desc_str.to_string());
                            }
                            if let Some(corr_obj) = d.objectForKey(corr_key) {
                                let arr: &NSArray<NSString> = unsafe { &*(&*corr_obj as *const AnyObject as *const NSArray<NSString>) };
                                for item in arr.iter() {
                                    suggestions.push(item.to_string());
                                }
                            }
                            if let Some(range_obj) = d.objectForKey(range_key) {
                                let inner_r: NSRange = unsafe { msg_send![&*range_obj, rangeValue] };
                                err_range = inner_r;
                            }
                        }
                    }

                    let (start_byte, end_byte) = match utf16_range_to_utf8_offsets(&text_string, err_range.location, err_range.length) {
                        Some(offsets) => offsets,
                        None => continue,
                    };

                    let matched_sub = ns_str.substringWithRange(err_range).to_string();
                    let top_guess = suggestions.first().cloned();
                    let message = desc.unwrap_or_else(|| format!("Grammar issue detected near '{}'.", matched_sub));

                    issues.push(Issue {
                        id: format!("native-grammar-{}", start_byte),
                        rule_id: "native.grammar".to_string(),
                        category: Category::Grammar,
                        severity: Severity::Error,
                        message,
                        start_offset: start_byte,
                        end_offset: end_byte,
                        matched_text: matched_sub,
                        replacement: top_guess,
                        suggestions,
                        apply_all_eligible: false, // Gated: requires explicit manual selection
                    });
                }
            }

            Ok(issues)
        })
    }
}
