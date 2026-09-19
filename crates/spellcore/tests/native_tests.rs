use spellcore::checker::Checker;
use spellcore::types::CheckMode;
use spellcore::{CheckerError, NativeChecker};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::time::{Duration, Instant};

fn test_fragment_mode_proper_noun_suppression() {
    println!("Running test_fragment_mode_proper_noun_suppression...");
    let checker = NativeChecker::new();

    // 1. Non-initial surname in 25-word selection
    let text1 = "The committee was pleased to welcome Dr. Arbuthnot, whose groundbreaking research into theoretical mathematics provided key insights for our entire department throughout the long semester.";
    let issues1 = checker.check(text1, "en_GB", 0, CheckMode::Fragment).expect("check should succeed");
    assert!(!issues1.iter().any(|i| i.matched_text.contains("Arbuthnot")), "Non-initial surname Arbuthnot must be suppressed in fragment mode");

    // 2. Fragment-initial proper noun Bingley
    let text2 = "Bingley had danced with Jane twice, and his admiration was evident to the entire room.";
    let issues2 = checker.check(text2, "en_GB", 0, CheckMode::Fragment).expect("check should succeed");
    assert!(!issues2.iter().any(|i| i.matched_text == "Bingley"), "Fragment-initial surname Bingley must be suppressed");

    println!("  -> passed");
}

fn test_fragment_initial_typo_still_fires() {
    println!("Running test_fragment_initial_typo_still_fires...");
    let checker = NativeChecker::new();

    for typo in &["Teh meeting was postponed.", "Wrok was finished on time.", "Thsi is an error."] {
        let issues = checker.check(typo, "en_GB", 0, CheckMode::Fragment).expect("check should succeed");
        assert!(!issues.is_empty(), "Deliberate typo must be flagged: {}", typo);
    }
    println!("  -> passed");
}

fn test_clean_corpus_fragment_mode_under_threshold() {
    println!("Running test_clean_corpus_fragment_mode_under_threshold...");
    let file = File::open("../../fixtures/gec/held_out.jsonl")
        .or_else(|_| File::open("fixtures/gec/held_out.jsonl"))
        .unwrap();
    let reader = BufReader::new(file);
    let checker = NativeChecker::new();

    let mut clean_count = 0;
    let mut total_words = 0;
    let mut fps = 0;

    for line in reader.lines() {
        let line = line.unwrap();
        if line.trim().is_empty() { continue; }
        let val: serde_json::Value = serde_json::from_str(&line).unwrap();
        if !val["is_clean"].as_bool().unwrap_or(false) { continue; }

        let sent = val["sentence"].as_str().unwrap();
        let words = sent.split_whitespace().count();
        clean_count += 1;
        total_words += words;

        let issues = checker.check(sent, "en_GB", 0, CheckMode::Fragment).unwrap();
        for iss in issues {
            if iss.severity != spellcore::types::Severity::Suggestion {
                fps += 1;
            }
        }
    }

    let rate = (fps as f64 / total_words as f64) * 1000.0;
    println!("  Clean sentences: {}, Words: {}, Clean FPs: {} ({:.2} / 1k words)", clean_count, total_words, fps, rate);
    assert!(rate < 0.50, "Clean false positive rate must be strictly under 0.50 / 1k words (got {:.2})", rate);
    println!("  -> passed");
}

fn test_document_mode_proper_nouns() {
    println!("Running test_document_mode_proper_nouns...");
    let checker = NativeChecker::new();
    let text_repeated = "We met with Arbuthnot yesterday. Later that afternoon, Arbuthnot gave the opening presentation.";
    let issues_repeated = checker.check(text_repeated, "en_GB", 0, CheckMode::Document).expect("check should succeed");
    assert!(!issues_repeated.iter().any(|i| i.matched_text.contains("Arbuthnot")), "Repeated proper noun in document mode must be suppressed");
    println!("  -> passed");
}

fn test_native_dual_dict_oxford_ize() {
    println!("Running test_native_dual_dict_oxford_ize...");
    let checker = NativeChecker::new();
    let text = "We organize the civilization with clear rules, but teh spelling must be right.";
    let issues = checker.check(text, "en_GB", 0, CheckMode::Document).expect("check should succeed");

    assert!(!issues.iter().any(|i| i.matched_text == "organize"), "organize should be accepted under dual-dict agreement");
    assert!(!issues.iter().any(|i| i.matched_text == "civilization"), "civilization should be accepted under dual-dict agreement");
    assert!(issues.iter().any(|i| i.matched_text == "teh"), "teh must be flagged");
    println!("  -> passed");
}

fn test_timeout_and_fail_fast_guard_regression() {
    println!("Running test_timeout_and_fail_fast_guard_regression...");
    let start = Instant::now();

    let handle = std::thread::spawn(|| {
        let checker = NativeChecker::with_timeout(Duration::from_millis(100));
        let text = "This is a quick test sentence.";
        checker.check(text, "en_GB", 0, CheckMode::Fragment)
    });

    let result = handle.join().expect("thread join must succeed");
    let elapsed = start.elapsed();

    assert!(elapsed < Duration::from_millis(50), "Fail-fast guard must complete in under 50ms (measured: {:?})", elapsed);

    match result {
        Err(CheckerError::MainThreadUnavailable(_)) | Err(CheckerError::Timeout(_)) => {
            println!("  -> fail-fast guard verified in {:?}", elapsed);
        }
        other => {
            panic!("Expected typed error from background thread without runloop, got {:?}", other);
        }
    }
    println!("  -> passed");
}

fn test_dialect_en_gb_and_en_us_spelling_acceptance() {
    println!("Running test_dialect_en_gb_and_en_us_spelling_acceptance...");
    let checker = NativeChecker::new();

    // 1. UK English check
    let uk_text = "This is a favourable proposal to organise the colour at the centre.";
    let uk_issues = checker.check(uk_text, "en_GB", 0, CheckMode::Document).expect("UK check should succeed");
    assert!(!uk_issues.iter().any(|i| i.matched_text == "favourable"), "favourable must not be flagged in en_GB");
    assert!(!uk_issues.iter().any(|i| i.matched_text == "organise"), "organise must not be flagged in en_GB");
    assert!(!uk_issues.iter().any(|i| i.matched_text == "colour"), "colour must not be flagged in en_GB");
    assert!(!uk_issues.iter().any(|i| i.matched_text == "centre"), "centre must not be flagged in en_GB");

    // 2. US English check
    let us_text = "This is a favorable proposal to organize the color at the center.";
    let us_issues = checker.check(us_text, "en_US", 0, CheckMode::Document).expect("US check should succeed");
    assert!(!us_issues.iter().any(|i| i.matched_text == "favorable"), "favorable must not be flagged in en_US");
    assert!(!us_issues.iter().any(|i| i.matched_text == "organize"), "organize must not be flagged in en_US");
    assert!(!us_issues.iter().any(|i| i.matched_text == "color"), "color must not be flagged in en_US");
    assert!(!us_issues.iter().any(|i| i.matched_text == "center"), "center must not be flagged in en_US");

    println!("  -> passed");
}

fn test_engine_mixed_dialect_and_confusion() {
    println!("Running test_engine_mixed_dialect_and_confusion...");
    let engine = spellcore::SpellcoreEngine::new();

    // 1. Confusion rule with UK and US spellings of colour/color
    let uk_confusion = "The cat licked it's colour coat.";
    let uk_issues = engine.check(uk_confusion, "en_GB", 0, CheckMode::Document);
    assert!(uk_issues.iter().any(|i| i.rule_id == "confusion.it_is_to_its"), "it's colour must trigger confusion rule");

    let us_confusion = "The cat licked it's color coat.";
    let us_issues = engine.check(us_confusion, "en_US", 0, CheckMode::Document);
    assert!(us_issues.iter().any(|i| i.rule_id == "confusion.it_is_to_its"), "it's color must trigger confusion rule");

    // 2. Mixed dialect consistency in document mode
    let mixed_doc = "We organise the event with colour, but we also organize the schedule.";
    let mixed_issues = engine.check(mixed_doc, "en_GB", 0, CheckMode::Document);
    assert!(
        mixed_issues.iter().any(|i| i.rule_id == "style.dialect_consistency"),
        "Mixed dialect in Document mode must trigger style.dialect_consistency suggestion"
    );

    println!("  -> passed");
}

fn main() {
    println!("=== Running native AppKit test suite on Thread 0 ===");
    test_fragment_mode_proper_noun_suppression();
    test_fragment_initial_typo_still_fires();
    test_clean_corpus_fragment_mode_under_threshold();
    test_document_mode_proper_nouns();
    test_native_dual_dict_oxford_ize();
    test_dialect_en_gb_and_en_us_spelling_acceptance();
    test_engine_mixed_dialect_and_confusion();
    test_timeout_and_fail_fast_guard_regression();
    println!("=== All native tests passed on Thread 0 ===");
}
