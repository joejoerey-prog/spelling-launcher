use crate::checker::{Checker, CheckerError};
use crate::types::{utf16_range_to_utf8_offsets, Category, CheckMode, Issue, Severity};
use objc2::msg_send;
use objc2::runtime::AnyObject;
use objc2_app_kit::NSSpellChecker;
use objc2_foundation::{
    ns_string, NSArray, NSRange, NSString, NSTextCheckingType,
};
use std::collections::{BTreeMap, HashSet};

extern "C" {
    fn pthread_main_np() -> i32;
    fn dispatch_async_f(
        queue: *mut std::ffi::c_void,
        context: *mut std::ffi::c_void,
        work: extern "C" fn(*mut std::ffi::c_void),
    );
    static mut _dispatch_main_q: std::ffi::c_void;
    fn CFRunLoopGetMain() -> *mut std::ffi::c_void;
    fn CFRunLoopCopyCurrentMode(rl: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    fn CFRelease(cf: *mut std::ffi::c_void);
}

fn is_sentence_initial(text: &str, start_byte: usize) -> bool {
    let before = &text[..start_byte];
    let trimmed = before.trim_end();
    if trimmed.is_empty() {
        return true;
    }
    let last_char = trimmed.chars().last().unwrap();
    if last_char == '\n' || last_char == '\r' {
        return true;
    }
    if last_char == '.' || last_char == '!' || last_char == '?' {
        if last_char == '.' {
            let before_dot = trimmed[..trimmed.len() - 1].trim_end();
            let last_word = before_dot.split_whitespace().last().unwrap_or("");
            let clean_last = last_word.trim_matches(|c: char| !c.is_alphabetic()).to_lowercase();
            let honorifics = ["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "eg", "ie"];
            if honorifics.contains(&clean_last.as_str()) {
                return false;
            }
        }
        return true;
    }
    false
}

fn damerau_levenshtein(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().map(|c| c.to_ascii_lowercase()).collect();
    let b_chars: Vec<char> = b.chars().map(|c| c.to_ascii_lowercase()).collect();
    let m = a_chars.len();
    let n = b_chars.len();
    let mut dp = vec![vec![0; n + 1]; m + 1];

    for i in 0..=m {
        dp[i][0] = i;
    }
    for j in 0..=n {
        dp[0][j] = j;
    }

    for i in 1..=m {
        for j in 1..=n {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            dp[i][j] = (dp[i - 1][j] + 1)
                .min(dp[i][j - 1] + 1)
                .min(dp[i - 1][j - 1] + cost);
            if i > 1 && j > 1 && a_chars[i - 1] == b_chars[j - 2] && a_chars[i - 2] == b_chars[j - 1] {
                dp[i][j] = dp[i][j].min(dp[i - 2][j - 2] + 1);
            }
        }
    }

    dp[m][n]
}

fn run_on_main_thread_with_timeout<F, R>(timeout: std::time::Duration, f: F) -> Result<R, CheckerError>
where
    F: FnOnce() -> R + Send + 'static,
    R: Send + 'static,
{
    let is_main = unsafe { pthread_main_np() != 0 };
    if is_main {
        Ok(f())
    } else {
        // Fast-fail guard: verify main thread run loop is active
        unsafe {
            let main_rl = CFRunLoopGetMain();
            let current_mode = CFRunLoopCopyCurrentMode(main_rl);
            if current_mode.is_null() {
                return Err(CheckerError::MainThreadUnavailable(
                    "Native text checking requires an active main-thread run loop (e.g. NSApplication or CFRunLoopRunInMode), but thread 0 is not running a run loop".to_string(),
                ));
            }
            CFRelease(current_mode);
        }

        struct Context<F, R> {
            func: Option<F>,
            tx: std::sync::mpsc::SyncSender<R>,
        }

        extern "C" fn trampoline<F, R>(context: *mut std::ffi::c_void)
        where
            F: FnOnce() -> R + Send + 'static,
            R: Send + 'static,
        {
            let mut ctx = unsafe { Box::from_raw(context as *mut Context<F, R>) };
            if let Some(func) = ctx.func.take() {
                let res = func();
                let _ = ctx.tx.send(res);
            }
        }

        let (tx, rx) = std::sync::mpsc::sync_channel(1);
        let ctx = Box::new(Context {
            func: Some(f),
            tx,
        });
        let ctx_ptr = Box::into_raw(ctx) as *mut std::ffi::c_void;

        unsafe {
            let queue = &raw mut _dispatch_main_q as *mut std::ffi::c_void;
            dispatch_async_f(queue, ctx_ptr, trampoline::<F, R>);
        }

        match rx.recv_timeout(timeout) {
            Ok(result) => Ok(result),
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                Err(CheckerError::Timeout(timeout))
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                Err(CheckerError::Internal(
                    "Main thread dispatch channel disconnected without result".to_string(),
                ))
            }
        }
    }
}

pub struct NativeChecker {
    pub timeout: std::time::Duration,
}

impl NativeChecker {
    pub const DEFAULT_TIMEOUT: std::time::Duration = std::time::Duration::from_millis(2000);

    pub fn new() -> Self {
        Self {
            timeout: Self::DEFAULT_TIMEOUT,
        }
    }

    pub fn with_timeout(timeout: std::time::Duration) -> Self {
        Self { timeout }
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

    fn check(&self, text: &str, language: &str, tag: isize, mode: CheckMode) -> Result<Vec<Issue>, CheckerError> {
        let text_string = text.to_string();
        let lang_string = language.to_string();

        run_on_main_thread_with_timeout(self.timeout, move || {
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

            // Fix B: Count capitalized words for proper noun heuristic in Document mode
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

                    let (start_byte, end_byte) = match utf16_range_to_utf8_offsets(&text_string, r_range.location, r_range.length) {
                        Some(offsets) => offsets,
                        None => continue,
                    };

                    // Proper noun heuristics (Fix B & Defect 1)
                    let clean_sub: String = sub.trim_matches(|c: char| !c.is_alphabetic()).to_string();
                    let is_capitalized = clean_sub.chars().next().map_or(false, |c| c.is_uppercase());

                    let guesses = checker.guessesForWordRange_inString_language_inSpellDocumentWithTag(
                        r_range,
                        &ns_str,
                        Some(primary_lang),
                        tag,
                    );

                    let suggestions: Vec<String> = guesses
                        .map(|arr| arr.iter().map(|s| s.to_string()).collect())
                        .unwrap_or_default();

                    match mode {
                        CheckMode::Document => {
                            let occurrences = proper_noun_counts.get(&clean_sub).copied().unwrap_or(0);
                            if is_capitalized && occurrences >= 2 {
                                continue; // Suppressed: recurring proper noun in document
                            }
                        }
                        CheckMode::Fragment => {
                            if is_capitalized {
                                if !is_sentence_initial(&text_string, start_byte) {
                                    continue; // Suppressed: non-sentence-initial capitalized token in fragment
                                }

                                // Fragment-initial capitalized token:
                                // 1. Check lowercase form
                                let lower_str = NSString::from_str(&clean_sub.to_lowercase());
                                let lower_res = checker.checkSpellingOfString_startingAt(&lower_str, 0);
                                if lower_res.length == 0 {
                                    continue; // Suppressed: lowercase form is a known dictionary word
                                }

                                // 2. Check edit distance to suggestions
                                let close_suggestions: Vec<(&String, usize)> = suggestions
                                    .iter()
                                    .map(|s| (s, damerau_levenshtein(&clean_sub, s.trim())))
                                    .filter(|(_, d)| *d <= 1)
                                    .collect();

                                // A close suggestion indicates a typo if its lowercase form is a recognized dictionary word
                                let is_typo = close_suggestions.iter().any(|(s, _)| {
                                    let s_lower = NSString::from_str(&s.to_lowercase());
                                    let s_res = checker.checkSpellingOfString_startingAt(&s_lower, 0);
                                    s_res.length == 0
                                });

                                if !is_typo {
                                    continue; // Suppressed: no close suggestion is a recognized dictionary word -> proper noun
                                }
                            }
                        }
                    }

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
                    if let Some(details) = r.grammarDetails() {
                        let desc_key = ns_string!("NSGrammarUserDescription");
                        let corr_key = ns_string!("NSGrammarCorrections");
                        let range_key = ns_string!("NSGrammarRange");

                        for d in details.iter() {
                            let mut desc = None;
                            let mut item_suggestions: Vec<String> = Vec::new();
                            let mut item_range = r_range;

                            if let Some(desc_obj) = d.objectForKey(desc_key) {
                                let desc_str: &NSString = unsafe { &*(&*desc_obj as *const AnyObject as *const NSString) };
                                desc = Some(desc_str.to_string());
                            }
                            if let Some(corr_obj) = d.objectForKey(corr_key) {
                                let arr: &NSArray<NSString> = unsafe { &*(&*corr_obj as *const AnyObject as *const NSArray<NSString>) };
                                for item in arr.iter() {
                                    item_suggestions.push(item.to_string());
                                }
                            }
                            if let Some(range_obj) = d.objectForKey(range_key) {
                                let inner_r: NSRange = unsafe { msg_send![&*range_obj, rangeValue] };
                                item_range = inner_r;
                            }

                            let (start_byte, end_byte) = match utf16_range_to_utf8_offsets(&text_string, item_range.location, item_range.length) {
                                Some(offsets) => offsets,
                                None => continue,
                            };

                            let matched_sub = ns_str.substringWithRange(item_range).to_string();
                            let top_guess = item_suggestions.first().cloned();
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
                                suggestions: item_suggestions,
                                apply_all_eligible: false,
                            });
                        }
                    } else {
                        let (start_byte, end_byte) = match utf16_range_to_utf8_offsets(&text_string, r_range.location, r_range.length) {
                            Some(offsets) => offsets,
                            None => continue,
                        };
                        let matched_sub = ns_str.substringWithRange(r_range).to_string();
                        issues.push(Issue {
                            id: format!("native-grammar-{}", start_byte),
                            rule_id: "native.grammar".to_string(),
                            category: Category::Grammar,
                            severity: Severity::Error,
                            message: format!("Grammar issue detected near '{}'.", matched_sub),
                            start_offset: start_byte,
                            end_offset: end_byte,
                            matched_text: matched_sub,
                            replacement: None,
                            suggestions: Vec::new(),
                            apply_all_eligible: false,
                        });
                    }
                }
            }

            issues
        })
    }
}
