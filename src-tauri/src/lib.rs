pub mod ai_proxy;
pub mod db;
pub mod fs_layer;
pub mod models;

use tauri::State;
use db::DatabaseManager;
use models::{
    DocumentInfo, FileOperationResult, IgnoredTerm, RewritePassageRequest,
    RewritePassageResponse, UserRule,
};

pub struct AppState {
    pub db: DatabaseManager,
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
async fn rewrite_passage(req: RewritePassageRequest) -> Result<RewritePassageResponse, String> {
    ai_proxy::rewrite_passage_api(req).await
}

pub fn run() {
    let db_manager = DatabaseManager::new().expect("Failed to initialize SQLite database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db: db_manager,
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
            rewrite_passage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Spelling Launcher application");
}
