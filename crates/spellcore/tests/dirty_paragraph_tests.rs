use spellcore::SpellcoreEngine;
use std::time::Instant;

fn find_paragraph_at_cursor(full_text: &str, cursor_byte: usize) -> (usize, usize, &str) {
    let before = &full_text[..cursor_byte];
    let after = &full_text[cursor_byte..];

    let start = before.rfind("\n\n").map(|idx| idx + 2).unwrap_or(0);
    let end_rel = after.find("\n\n").unwrap_or(after.len());
    let end = cursor_byte + end_rel;

    (start, end, &full_text[start..end])
}

fn main() {
    println!("=== Step 4 & 5 Regression: 50,000-Word Document Dirty-Paragraph Check ===");

    let sample_paragraph = "The development of modern literature in the nineteenth century reflected deep social changes across Britain and Europe. Writers observed the rise of industrial cities, the expansion of railways, and the shifting dynamics between traditional rural communities and emerging urban centres. In their essays and novels, they explored human psychology, moral dilemmas, and philosophical inquiries with unprecedented depth and precision, creating enduring works that continue to inform contemporary thought.";

    let num_paras = 760; // 760 * 66 = 50,160 words
    let mut paragraphs = Vec::with_capacity(num_paras);
    for _ in 0..num_paras {
        paragraphs.push(sample_paragraph);
    }
    let full_doc = paragraphs.join("\n\n");
    let total_words = full_doc.split_whitespace().count();
    println!("Constructed document with {} words across {} paragraphs.", total_words, num_paras);
    assert!(total_words >= 50_000, "Document must have at least 50,000 words");

    let engine = SpellcoreEngine::new();
    let tag = SpellcoreEngine::create_document_tag();

    // AppKit / AppleSpell engine warm-up (simulating app launch check)
    let _ = engine.check_paragraph("Initial launch warm-up sentence.", 0, "en_GB", tag);
    let _ = engine.check_paragraph(sample_paragraph, 0, "en_GB", tag);

    // Keystroke at cursor inside paragraph 380 (middle of the 50,000-word document)
    let para_380_start = full_doc.match_indices("\n\n").nth(379).map(|(idx, _)| idx + 2).unwrap_or(0);
    let cursor_pos = para_380_start + 45;

    let (start, end, dirty_text) = find_paragraph_at_cursor(&full_doc, cursor_pos);
    assert_eq!(dirty_text, sample_paragraph);

    // Modify paragraph text to simulate typing a typo: "unprecedented" -> "unprecednted"
    let edited_para = dirty_text.replace("unprecedented", "unprecednted");

    // Measure keystroke check time of ONLY the dirty paragraph
    let t_check = Instant::now();
    let issues = engine.check_paragraph(&edited_para, start, "en_GB", tag);
    let elapsed_check = t_check.elapsed();

    println!("Synchronously checked dirty paragraph in {:?}", elapsed_check);
    let budget_ms = if cfg!(debug_assertions) { 100 } else { 30 };
    assert!(elapsed_check.as_millis() < budget_ms, "Single dirty paragraph check must complete within {}ms budget (measured: {:?})", budget_ms, elapsed_check);

    #[cfg(target_os = "macos")]
    {
        let typo_issue = issues.iter().find(|i| i.matched_text == "unprecednted").expect("unprecednted must be flagged");
        assert!(typo_issue.start_offset >= start && typo_issue.end_offset <= end, "Issue offset must map to global document span");
        println!("Typo accurately flagged at document offsets [{}-{}]", typo_issue.start_offset, typo_issue.end_offset);
    }

    // LRU Cache hit test
    let t_cached1 = Instant::now();
    let _ = engine.check_paragraph(sample_paragraph, 0, "en_GB", tag);
    let uncached_time = t_cached1.elapsed();

    let t_cached2 = Instant::now();
    let cached_issues = engine.check_paragraph(sample_paragraph, 0, "en_GB", tag);
    let cached_time = t_cached2.elapsed();

    println!("Uncached paragraph check: {:?}", uncached_time);
    println!("Cached paragraph check:   {:?}", cached_time);
    assert_eq!(cached_issues.len(), 0);
    assert!(cached_time.as_micros() < 50, "LRU cache hit must return in under 50 microseconds (got {:?})", cached_time);

    // Memory bound test: assert cache memory is well bounded below 8 MB
    println!("Engine cache entries: {}, memory: {} bytes", engine.cache().len(), engine.cache().current_bytes());
    assert!(engine.cache().current_bytes() < 8 * 1024 * 1024, "Cache memory must not exceed 8 MB");

    SpellcoreEngine::close_document_tag(tag);
    println!("=== 50,000-word dirty-paragraph regression test passed successfully! ===");
}
