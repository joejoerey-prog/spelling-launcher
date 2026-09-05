use serde::Serialize;
use spellcore::{Issue, SpellcoreEngine};
use std::env;
use std::io::{self, Read};

const VERSION: &str = env!("CARGO_PKG_VERSION");
const GIT_SHA_OPT: Option<&str> = option_env!("GIT_SHA");
const TARGET: &str = "aarch64-apple-darwin";

fn git_sha() -> &'static str {
    GIT_SHA_OPT.unwrap_or("release")
}

#[derive(Serialize)]
struct CliOutput {
    version: String,
    language: String,
    issue_count: usize,
    issues: Vec<Issue>,
}

fn print_version() {
    println!("spellcheck-cli {} ({} {})", VERSION, git_sha(), TARGET);
}

fn print_help() {
    println!("Spelling Launcher CLI - native text checking engine");
    println!("Usage:");
    println!("  spellcheck-cli --version");
    println!("  spellcheck-cli --check <text> [--language en_GB|en_US]");
    println!("  spellcheck-cli --stdin [--language en_GB|en_US]");
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
    let mut text_to_check = String::new();

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--language" | "-l" => {
                if i + 1 < args.len() {
                    language = args[i + 1].clone();
                    i += 1;
                }
            }
            "--check" | "-c" => {
                if i + 1 < args.len() {
                    text_to_check = args[i + 1].clone();
                    i += 1;
                }
            }
            "--stdin" => {
                let mut buf = String::new();
                let _ = io::stdin().read_to_string(&mut buf);
                text_to_check = buf;
            }
            _ => {
                if text_to_check.is_empty() && !args[i].starts_with('-') {
                    text_to_check = args[i].clone();
                }
            }
        }
        i += 1;
    }

    if text_to_check.is_empty() {
        eprintln!("Error: No text provided to check.");
        std::process::exit(1);
    }

    let engine = SpellcoreEngine::new();
    let tag = SpellcoreEngine::create_document_tag();
    let issues = engine.check_document(&text_to_check, &language, tag);
    SpellcoreEngine::close_document_tag(tag);

    let output = CliOutput {
        version: format!("{} ({})", VERSION, git_sha()),
        language,
        issue_count: issues.len(),
        issues,
    };

    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}
