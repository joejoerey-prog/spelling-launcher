use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentInfo {
    pub id: Option<i64>,
    pub file_path: String,
    pub title: String,
    pub word_count: usize,
    pub last_modified: String,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserRule {
    pub id: Option<i64>,
    pub name: String,
    pub pattern: String,
    pub replacement: String,
    pub category: String, // "style", "spelling", "tone", "custom"
    pub description: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IgnoredTerm {
    pub id: Option<i64>,
    pub term: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSetting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SettingsMigration {
    pub schema_version: i64,
    pub schema_version_from: i64,
    pub schema_version_to: i64,
    pub prior_json_payload: String,
    pub applied_at: String,
    pub acknowledged_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RewritePassageRequest {
    pub text: String,
    pub tone: String,      // "casual", "professional", "academic", "confident", "friendly", "direct"
    pub length: String,    // "shorten", "expand", "same"
    pub goal: String,      // "clarity", "fluency", "persuasive", "general"
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RewritePassageResponse {
    pub variations: Vec<String>,
    pub latency_ms: u64,
    pub provider: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileOperationResult {
    pub success: bool,
    pub path: String,
    pub message: String,
    pub content: Option<String>,
    pub word_count: Option<usize>,
}
