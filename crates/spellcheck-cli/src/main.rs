use serde::Serialize;
use spellcore::types::CheckMode;
use spellcore::{Issue, SpellcoreEngine};
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::io::{self, Read};
use std::path::Path;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const GIT_SHA: &str = env!("GIT_SHA");
const BUILD_PROFILE: &str = env!("BUILD_PROFILE");
const BUILD_TARGET: &str = env!("BUILD_TARGET");

#[derive(Serialize)]
struct CliOutput {
    version: String,
    language: String,
    mode: String,
    issue_count: usize,
    issues: Vec<Issue>,
}

fn print_version() {
    println!("spellcheck-cli {} ({}, {}, {})", VERSION, BUILD_PROFILE, GIT_SHA, BUILD_TARGET);
}

fn print_help() {
    println!("Spelling Launcher CLI - native text checking engine");
    println!("Usage:");
    println!("  spellcheck-cli --version");
    println!("  spellcheck-cli --check <text> [--language en_GB|en_US] [--mode document|fragment]");
    println!("  spellcheck-cli --restore <text> [--language en_GB|en_US] [--mode document|fragment]");
    println!("  spellcheck-cli --stdin [--language en_GB|en_US] [--mode document|fragment]");
    println!("  spellcheck-cli --audit-dir <dir_path> [--language en_GB|en_US]");
}

fn collect_text_files(dir: &Path, files: &mut Vec<std::path::PathBuf>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_text_files(&path, files);
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("txt") {
                        files.push(path);
                    }
                }
            }
        }
    }
}

fn run_audit_dir(dir_str: &str, language: &str) {
    let dir_path = Path::new(dir_str);
    if !dir_path.exists() || !dir_path.is_dir() {
        eprintln!("Error: Path '{}' is not a valid directory.", dir_str);
        std::process::exit(1);
    }

    let mut files = Vec::new();
    collect_text_files(dir_path, &mut files);

    if files.is_empty() {
        println!("Audit: No .md or .txt files found in '{}'.", dir_str);
        return;
    }

    println!("=== spellcheck-cli Directory Audit ===");
    println!("Target directory: {}", dir_str);
    println!("Files found: {}", files.len());
    println!("Language: {}", language);

    let engine = SpellcoreEngine::new();
    let tag = SpellcoreEngine::create_document_tag();

    let mut total_words = 0usize;
    let mut total_sentences = 0usize;
    let mut rule_counts: BTreeMap<String, usize> = BTreeMap::new();

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            let words = content.split_whitespace().count();
            total_words += words;
            total_sentences += content.split(|c| c == '.' || c == '!' || c == '?').count();

            let issues = engine.check(&content, language, tag, CheckMode::Document);
            for issue in issues {
                *rule_counts.entry(issue.rule_id).or_insert(0) += 1;
            }
        }
    }

    SpellcoreEngine::close_document_tag(tag);

    println!("Total words scanned: {}", total_words);
    println!("Total sentences: {}", total_sentences);
    println!("----------------------------------------------------------------------");
    println!("{:<36} {:<12} {:<15}", "Rule ID", "Total Hits", "Hits / 1k Words");
    println!("----------------------------------------------------------------------");

    let mut sorted_rules: Vec<(String, usize)> = rule_counts.into_iter().collect();
    sorted_rules.sort_by(|a, b| b.1.cmp(&a.1));

    for (rule_id, count) in sorted_rules {
        let rate_per_1k = if total_words > 0 {
            (count as f64 / total_words as f64) * 1000.0
        } else {
            0.0
        };
        println!("{:<36} {:<12} {:.2}", rule_id, count, rate_per_1k);
    }
    println!("----------------------------------------------------------------------");
}

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        print_help();
        return;
    }

    if args.contains(&"--version".to_string()) || args.contains(&"-v".to_string()) {
        print_version();
        return;
    }

    if args.contains(&"--help".to_string()) || args.contains(&"-h".to_string()) {
        print_help();
        return;
    }

    let mut language = "en_GB".to_string();
    let mut mode = CheckMode::Fragment; // default for CLI arguments (short selections)
    let mut text_to_check = String::new();
    let mut audit_dir_path: Option<String> = None;
    let mut is_restore_mode = false;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--language" | "-l" => {
                if i + 1 < args.len() {
                    language = args[i + 1].clone();
                    i += 1;
                }
            }
            "--mode" | "-m" => {
                if i + 1 < args.len() {
                    let m_str = args[i + 1].to_lowercase();
                    if m_str == "document" || m_str == "doc" {
                        mode = CheckMode::Document;
                    } else {
                        mode = CheckMode::Fragment;
                    }
                    i += 1;
                }
            }
            "--audit-dir" => {
                if i + 1 < args.len() {
                    audit_dir_path = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "--restore" | "-r" | "restore" => {
                is_restore_mode = true;
                if i + 1 < args.len() && !args[i + 1].starts_with('-') {
                    text_to_check = args[i + 1].clone();
                    i += 1;
                }
            }
            "--check" | "-c" | "check" => {
                if i + 1 < args.len() {
                    text_to_check = args[i + 1].clone();
                    i += 1;
                }
            }
            "--stdin" => {
                let mut buf = String::new();
                let _ = io::stdin().read_to_string(&mut buf);
                text_to_check = buf;
                if !args.contains(&"--mode".to_string()) {
                    mode = CheckMode::Document;
                }
            }
            _ => {
                if text_to_check.is_empty() && !args[i].starts_with('-') {
                    text_to_check = args[i].clone();
                }
            }
        }
        i += 1;
    }

    if is_restore_mode && !args.contains(&"--mode".to_string()) && !args.contains(&"-m".to_string()) {
        mode = CheckMode::Document;
    }

    if let Some(dir) = audit_dir_path {
        run_audit_dir(&dir, &language);
        return;
    }

    if text_to_check.is_empty() {
        eprintln!("Error: No text provided to check.");
        std::process::exit(1);
    }

    let engine = SpellcoreEngine::new();
    let tag = SpellcoreEngine::create_document_tag();
    let issues = engine.check(&text_to_check, &language, tag, mode);
    SpellcoreEngine::close_document_tag(tag);

    if is_restore_mode {
        let mut applicable_issues: Vec<_> = issues
            .into_iter()
            .filter(|i| i.replacement.is_some())
            .collect();

        // Sort descending by start_offset; if equal start_offset, wider span first (descending by end_offset)
        applicable_issues.sort_by(|a, b| {
            b.start_offset
                .cmp(&a.start_offset)
                .then_with(|| b.end_offset.cmp(&a.end_offset))
        });

        let mut bytes = text_to_check.as_bytes().to_vec();
        let mut last_start = usize::MAX;

        for issue in applicable_issues {
            if let Some(rep) = &issue.replacement {
                if issue.end_offset <= last_start && issue.end_offset <= bytes.len() && issue.start_offset <= issue.end_offset {
                    let mut new_bytes = Vec::with_capacity(bytes.len() + rep.len());
                    new_bytes.extend_from_slice(&bytes[..issue.start_offset]);
                    new_bytes.extend_from_slice(rep.as_bytes());
                    new_bytes.extend_from_slice(&bytes[issue.end_offset..]);
                    bytes = new_bytes;
                    last_start = issue.start_offset;
                }
            }
        }

        let restored = String::from_utf8_lossy(&bytes);
        print!("{}", restored);
        return;
    }

    let mode_str = match mode {
        CheckMode::Document => "document",
        CheckMode::Fragment => "fragment",
    };

    let output = CliOutput {
        version: format!("{} ({})", VERSION, GIT_SHA),
        language,
        mode: mode_str.to_string(),
        issue_count: issues.len(),
        issues,
    };

    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}
