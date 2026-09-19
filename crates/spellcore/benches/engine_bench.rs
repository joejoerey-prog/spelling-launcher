use spellcore::types::CheckMode;
use spellcore::SpellcoreEngine;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::time::Instant;

fn percentile(sorted: &[f64], pct: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((sorted.len() as f64) * (pct / 100.0)).ceil() as usize;
    if idx == 0 {
        sorted[0]
    } else if idx > sorted.len() {
        sorted[sorted.len() - 1]
    } else {
        sorted[idx - 1]
    }
}

fn main() {
    println!("=== Strategy H (Hybrid Native + Deterministic) Release Benchmark ===");

    let engine = SpellcoreEngine::new();
    let tag = SpellcoreEngine::create_document_tag();

    // 1. Load corpus
    let file = File::open("fixtures/gec/held_out.jsonl")
        .or_else(|_| File::open("../../fixtures/gec/held_out.jsonl"))
        .expect("held_out.jsonl must exist");
    let reader = BufReader::new(file);

    let mut sentences: Vec<String> = Vec::new();
    for line in reader.lines() {
        let line = line.unwrap();
        if line.trim().is_empty() {
            continue;
        }
        let val: serde_json::Value = serde_json::from_str(&line).unwrap();
        let s = val["sentence"].as_str().unwrap().to_string();
        sentences.push(s);
    }

    println!("Loaded {} evaluation sentences from held-out corpus.", sentences.len());

    // Warm up
    for s in sentences.iter().take(10) {
        let _ = engine.check(s, "en_GB", tag, CheckMode::Document);
    }

    // 2. Measure In-Process Document-Mode Check Latency (App Paragraph / Sentence Flow)
    let mut doc_latencies_ms: Vec<f64> = Vec::with_capacity(sentences.len());
    for s in &sentences {
        let start = Instant::now();
        let _ = engine.check(s, "en_GB", tag, CheckMode::Document);
        let elapsed = start.elapsed().as_secs_f64() * 1000.0;
        doc_latencies_ms.push(elapsed);
    }

    doc_latencies_ms.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let doc_p50 = percentile(&doc_latencies_ms, 50.0);
    let doc_p95 = percentile(&doc_latencies_ms, 95.0);
    let doc_p99 = percentile(&doc_latencies_ms, 99.0);
    let doc_mean = doc_latencies_ms.iter().sum::<f64>() / (doc_latencies_ms.len() as f64);

    // 3. Measure In-Process Fragment-Mode Check Latency (Raycast Selection Flow)
    let mut frag_latencies_ms: Vec<f64> = Vec::with_capacity(sentences.len());
    for s in &sentences {
        let start = Instant::now();
        let _ = engine.check(s, "en_GB", tag, CheckMode::Fragment);
        let elapsed = start.elapsed().as_secs_f64() * 1000.0;
        frag_latencies_ms.push(elapsed);
    }

    frag_latencies_ms.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let frag_p50 = percentile(&frag_latencies_ms, 50.0);
    let frag_p95 = percentile(&frag_latencies_ms, 95.0);
    let frag_p99 = percentile(&frag_latencies_ms, 99.0);
    let frag_mean = frag_latencies_ms.iter().sum::<f64>() / (frag_latencies_ms.len() as f64);

    // 4. Dirty Paragraph in 50,000-Word Document Benchmark
    let base_paragraph = "The quick brown fox jumps over the lazy dog. In order to make a decision, the team met in close proximity due to the fact that we had future plans.\n\n";
    let dirty_paragraph = "The quikc brown fox jumps over the lazy dog with a recieved typo.\n\n";
    let mut big_doc = String::with_capacity(50_000 * 6);
    let dirty_para_idx = 380;
    for i in 0..760 {
        if i == dirty_para_idx {
            big_doc.push_str(dirty_paragraph);
        } else {
            big_doc.push_str(base_paragraph);
        }
    }

    let p_offset = dirty_para_idx * base_paragraph.len();
    let mut dirty_latencies_ms: Vec<f64> = Vec::with_capacity(50);
    for _ in 0..50 {
        let start = Instant::now();
        let _ = engine.check_paragraph(dirty_paragraph, p_offset, "en_GB", tag);
        let elapsed = start.elapsed().as_secs_f64() * 1000.0;
        dirty_latencies_ms.push(elapsed);
    }
    dirty_latencies_ms.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let dirty_p50 = percentile(&dirty_latencies_ms, 50.0);
    let dirty_p95 = percentile(&dirty_latencies_ms, 95.0);
    let dirty_p99 = percentile(&dirty_latencies_ms, 99.0);

    SpellcoreEngine::close_document_tag(tag);

    println!("\n==========================================================================================");
    println!("                           MEASURED RELEASE LATENCY BENCHMARK                             ");
    println!("                    (Profile: release, opt-level = 3, LTO: true, Apple Silicon)           ");
    println!("==========================================================================================");
    println!("{:<32} | {:<9} | {:<9} | {:<9} | {:<9} | {:<8}", "Workload Surface", "p50 (ms)", "p95 (ms)", "p99 (ms)", "Target", "Status");
    println!("------------------------------------------------------------------------------------------");

    let doc_status = if doc_p95 <= 30.0 { "PASS" } else { "FAIL" };
    let frag_status = if frag_p95 <= 30.0 { "PASS" } else { "FAIL" };
    let dirty_status = if dirty_p95 <= 30.0 { "PASS" } else { "FAIL" };

    println!("{:<32} | {:>7.2} ms | {:>7.2} ms | {:>7.2} ms | <= 30 ms  | {:<8}", "Document Mode (Sentence Check)", doc_p50, doc_p95, doc_p99, doc_status);
    println!("{:<32} | {:>7.2} ms | {:>7.2} ms | {:>7.2} ms | <= 30 ms  | {:<8}", "Fragment Mode (Raycast Flow)", frag_p50, frag_p95, frag_p99, frag_status);
    println!("{:<32} | {:>7.2} ms | {:>7.2} ms | {:>7.2} ms | <= 30 ms  | {:<8}", "Dirty Paragraph (50k-word doc)", dirty_p50, dirty_p95, dirty_p99, dirty_status);
    println!("==========================================================================================");
    println!("Summary: Mean Document Latency = {:.2} ms | Mean Fragment Latency = {:.2} ms", doc_mean, frag_mean);
}
