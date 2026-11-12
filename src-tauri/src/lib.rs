pub mod ai_proxy;
pub mod db;
pub mod fs_layer;
pub mod models;

use tauri::State;
use db::DatabaseManager;
use models::{
    DocumentInfo, FileOperationResult, IgnoredTerm, RewritePassageRequest,
    RewritePassageResponse, SettingsMigration, UserRule,
};

use regex::{Regex, RegexBuilder};
use spellcore::{Category, Issue, Severity, SpellcoreEngine, SyntaxMasker};
use std::collections::HashSet;
use std::sync::Arc;

pub struct AppState {
    pub db: DatabaseManager,
    pub engine: Arc<SpellcoreEngine>,
    pub tag: isize,
}

/// Convert a UTF-8 byte offset within `text` to a UTF-16 code unit offset (what JS string indices use).
fn utf8_to_utf16_offset(text: &str, byte: usize) -> usize {
    text.get(..byte)
        .unwrap_or(text)
        .encode_utf16()
        .count()
}

fn compile_rule_pattern(pattern: &str) -> Result<Regex, regex::Error> {
    RegexBuilder::new(pattern).case_insensitive(true).build()
}

fn panic_message(payload: &(dyn std::any::Any + Send)) -> String {
    if let Some(s) = payload.downcast_ref::<&str>() {
        (*s).to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "unknown panic".to_string()
    }
}

/// Issues for active user rules, with UTF-8 byte offsets into `text`.
fn user_rule_issues(text: &str, rules: &[UserRule]) -> Vec<Issue> {
    let masked = SyntaxMasker::find_masked_spans(text);
    let mut out = Vec::new();
    for rule in rules.iter().filter(|r| r.is_active) {
        let Ok(re) = compile_rule_pattern(&rule.pattern) else { continue };
        for m in re.find_iter(text) {
            if m.as_str().is_empty()
                || m.as_str() == rule.replacement
                || masked.iter().any(|&(s, e)| s < m.end() && e > m.start())
            {
                continue;
            }
            out.push(Issue {
                id: String::new(),
                rule_id: format!("user.{}", rule.id.unwrap_or(0)),
                category: Category::Style,
                severity: Severity::Suggestion,
                message: rule.name.clone(),
                start_offset: m.start(),
                end_offset: m.end(),
                matched_text: m.as_str().to_string(),
                replacement: Some(rule.replacement.clone()),
                suggestions: vec![rule.replacement.clone()],
                apply_all_eligible: false,
            });
        }
    }
    out
}

/// Drop ignored spelling issues, add user-rule issues, and convert byte offsets to
/// UTF-16 offsets in the full document (`base_utf16` is the UTF-16 offset of `text` within it).
fn postprocess_issues(
    text: &str,
    base_utf16: usize,
    mut issues: Vec<Issue>,
    ignored: &HashSet<String>,
    rules: &[UserRule],
) -> Vec<Issue> {
    issues.retain(|i| {
        i.category != Category::Spelling || !ignored.contains(&i.matched_text.trim().to_lowercase())
    });
    issues.extend(user_rule_issues(text, rules));
    for i in &mut issues {
        i.start_offset = base_utf16 + utf8_to_utf16_offset(text, i.start_offset);
        i.end_offset = base_utf16 + utf8_to_utf16_offset(text, i.end_offset);
        i.id = format!("{}:{}:{}", i.rule_id, i.start_offset, i.end_offset);
    }
    issues.sort_by_key(|i| i.start_offset);
    issues
}

fn finish_check(
    state: &AppState,
    text: &str,
    base_utf16: usize,
    issues: Vec<Issue>,
) -> Result<Vec<Issue>, String> {
    let ignored: HashSet<String> = state
        .db
        .get_ignored_terms()?
        .into_iter()
        .map(|t| t.term.trim().to_lowercase())
        .collect();
    let rules = state.db.get_user_rules()?;
    Ok(postprocess_issues(text, base_utf16, issues, &ignored, &rules))
}

/// Returns issues with UTF-16 offsets into `text`.
#[tauri::command]
fn check_document(
    state: State<AppState>,
    text: String,
    language: Option<String>,
) -> Result<Vec<Issue>, String> {
    let issues = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let lang = language.unwrap_or_else(|| "en_GB".to_string());
        state.engine.check_document(&text, &lang, state.tag)
    }))
    .map_err(|e| format!("Error in text check: {}", panic_message(&*e)))?;
    finish_check(&state, &text, 0, issues)
}

/// Returns issues with UTF-16 offsets into the full document; `paragraph_offset` is a UTF-16 offset.
#[tauri::command]
fn check_paragraph(
    state: State<AppState>,
    paragraph_text: String,
    paragraph_offset: usize,
    language: Option<String>,
) -> Result<Vec<Issue>, String> {
    let issues = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let lang = language.unwrap_or_else(|| "en_GB".to_string());
        state.engine.check_paragraph(&paragraph_text, 0, &lang, state.tag)
    }))
    .map_err(|e| format!("Error in paragraph check: {}", panic_message(&*e)))?;
    finish_check(&state, &paragraph_text, paragraph_offset, issues)
}

#[tauri::command]
fn learn_word(state: State<AppState>, word: String) -> Result<(), String> {
    state.db.add_ignored_term(&word)?;
    state.engine.bump_dictionary_revision();
    Ok(())
}

#[tauri::command]
fn ignore_word(state: State<AppState>, word: String) -> Result<(), String> {
    state.db.add_ignored_term(&word)?;
    state.engine.bump_dictionary_revision();
    Ok(())
}

#[tauri::command]
fn read_document(file_path: String) -> Result<FileOperationResult, String> {
    fs_layer::read_document_file(&file_path)
}

#[tauri::command]
fn parse_document_bytes(filename: String, bytes: Vec<u8>) -> Result<String, String> {
    fs_layer::parse_document_from_bytes(&filename, &bytes)
}

#[tauri::command]
fn save_document(
    file_path: String,
    content: String,
    create_backup: bool,
) -> Result<FileOperationResult, String> {
    fs_layer::save_document_file(&file_path, &content, create_backup)
}

#[tauri::command]
fn export_document(
    filename: String,
    content: String,
    target_dir: Option<String>,
) -> Result<FileOperationResult, String> {
    fs_layer::export_document_file(&filename, &content, target_dir.as_deref())
}

#[tauri::command]
fn sanitize_name(name: String) -> String {
    fs_layer::sanitize_filename(&name)
}

#[tauri::command]
fn get_recent_documents(
    state: State<AppState>,
    limit: Option<usize>,
) -> Result<Vec<DocumentInfo>, String> {
    state.db.get_recent_docs(limit.unwrap_or(20))
}

#[tauri::command]
fn add_recent_document(state: State<AppState>, doc: DocumentInfo) -> Result<(), String> {
    state.db.add_or_update_recent_doc(&doc)
}

#[tauri::command]
fn get_rules(state: State<AppState>) -> Result<Vec<UserRule>, String> {
    state.db.get_user_rules()
}

#[tauri::command]
fn add_rule(state: State<AppState>, rule: UserRule) -> Result<i64, String> {
    compile_rule_pattern(&rule.pattern)
        .map_err(|e| format!("Invalid rule pattern '{}': {}", rule.pattern, e))?;
    state.db.insert_user_rule(&rule)
}

#[tauri::command]
fn delete_rule(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.delete_user_rule(id)
}

#[tauri::command]
fn toggle_rule(state: State<AppState>, id: i64, active: bool) -> Result<(), String> {
    state.db.toggle_user_rule(id, active)
}

#[tauri::command]
fn get_ignored(state: State<AppState>) -> Result<Vec<IgnoredTerm>, String> {
    state.db.get_ignored_terms()
}

#[tauri::command]
fn add_ignored(state: State<AppState>, term: String) -> Result<i64, String> {
    state.db.add_ignored_term(&term)
}

#[tauri::command]
fn remove_ignored(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.remove_ignored_term(id)
}

#[tauri::command]
fn get_app_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    state.db.get_setting(&key)
}

#[tauri::command]
fn set_app_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    state.db.set_setting(&key, &value)
}

#[tauri::command]
fn get_unacknowledged_migration(state: State<AppState>) -> Result<Option<SettingsMigration>, String> {
    state.db.get_unacknowledged_migration()
}

#[tauri::command]
fn acknowledge_migration(state: State<AppState>, version: i64) -> Result<(), String> {
    state.db.acknowledge_migration(version)
}

#[tauri::command]
async fn rewrite_passage(req: RewritePassageRequest) -> Result<RewritePassageResponse, String> {
    ai_proxy::rewrite_passage_api(req).await
}

pub fn run() {
    let db_manager = DatabaseManager::new().expect("Failed to initialize SQLite database");
    let engine = Arc::new(SpellcoreEngine::new());
    let tag = SpellcoreEngine::create_document_tag();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState {
            db: db_manager,
            engine,
            tag,
        })
        .invoke_handler(tauri::generate_handler![
            read_document,
            parse_document_bytes,
            save_document,
            export_document,
            sanitize_name,
            get_recent_documents,
            add_recent_document,
            get_rules,
            add_rule,
            delete_rule,
            toggle_rule,
            get_ignored,
            add_ignored,
            remove_ignored,
            get_app_setting,
            set_app_setting,
            get_unacknowledged_migration,
            acknowledge_migration,
            rewrite_passage,
            check_document,
            check_paragraph,
            learn_word,
            ignore_word,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Spelling Launcher application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rule(id: i64, pattern: &str, replacement: &str, active: bool) -> UserRule {
        UserRule {
            id: Some(id),
            name: "R".into(),
            pattern: pattern.into(),
            replacement: replacement.into(),
            category: "custom".into(),
            description: String::new(),
            is_active: active,
        }
    }

    fn spelling(text: &str, start: usize, end: usize) -> Issue {
        Issue {
            id: "x".into(),
            rule_id: "native.spelling".into(),
            category: Category::Spelling,
            severity: Severity::Error,
            message: String::new(),
            start_offset: start,
            end_offset: end,
            matched_text: text[start..end].to_string(),
            replacement: None,
            suggestions: vec![],
            apply_all_eligible: false,
        }
    }

    #[test]
    fn utf16_offsets() {
        let t = "a\u{e9}\u{201c}\u{1F600}z"; // a, e-acute (2B), curly quote (3B), emoji (4B, 2 units), z
        assert_eq!(utf8_to_utf16_offset(t, 0), 0);
        assert_eq!(utf8_to_utf16_offset(t, 1), 1);
        assert_eq!(utf8_to_utf16_offset(t, 3), 2);
        assert_eq!(utf8_to_utf16_offset(t, 6), 3);
        assert_eq!(utf8_to_utf16_offset(t, 10), 5);
        assert_eq!(utf8_to_utf16_offset(t, 11), 6);
        assert_eq!(utf8_to_utf16_offset("plain", 3), 3);
    }

    #[test]
    fn paragraph_offsets_and_ids_are_unique() {
        let t = "\u{e9}x teh";
        let issues = vec![spelling(t, 4, 7)];
        let out = postprocess_issues(t, 100, issues, &HashSet::new(), &[]);
        assert_eq!((out[0].start_offset, out[0].end_offset), (103, 106));
        assert_eq!(out[0].id, "native.spelling:103:106");
    }

    #[test]
    fn ignored_terms_drop_spelling_only() {
        let t = "Kubernetes ok";
        let mut grammar = spelling(t, 0, 10);
        grammar.category = Category::Grammar;
        let ignored: HashSet<String> = ["kubernetes".to_string()].into();
        let out = postprocess_issues(t, 0, vec![spelling(t, 0, 10), grammar], &ignored, &[]);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].category, Category::Grammar);
    }

    #[test]
    fn user_rules_applied_with_filters() {
        let t = "A Test and `test` and https://x.io/test.";
        let rules = vec![
            rule(7, r"\btest\b", "exam", true),
            rule(8, "(", "x", true),     // invalid regex: skipped
            rule(9, "x*", "y", true),     // empty matches: skipped
            rule(10, "and", "and", true), // already equal: skipped
            rule(11, "A", "B", false),    // inactive: skipped
        ];
        let out = postprocess_issues(t, 0, vec![], &HashSet::new(), &rules);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].rule_id, "user.7");
        assert_eq!(out[0].matched_text, "Test");
        assert_eq!(out[0].replacement.as_deref(), Some("exam"));
        assert_eq!((out[0].start_offset, out[0].end_offset), (2, 6));
    }

    #[test]
    fn invalid_rule_pattern_rejected() {
        assert!(compile_rule_pattern("(").is_err());
        assert!(compile_rule_pattern(r"\bfoo\b").is_ok());
    }

    #[test]
    fn panic_payload_text_is_extracted() {
        let e = std::panic::catch_unwind(|| panic!("boom")).unwrap_err();
        assert_eq!(panic_message(&*e), "boom");
        let e = std::panic::catch_unwind(|| panic!("{}", String::from("bang"))).unwrap_err();
        assert_eq!(panic_message(&*e), "bang");
    }
}
