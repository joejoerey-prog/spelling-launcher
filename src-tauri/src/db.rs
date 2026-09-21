use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use crate::models::{DocumentInfo, IgnoredTerm, SettingsMigration, UserRule};

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new() -> Result<Self, String> {
        let app_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("SpellingLauncher");

        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)
                .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        }

        let db_path = app_dir.join("spelling_launcher.sqlite");
        let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;
        let mgr = DatabaseManager {
            conn: Mutex::new(conn),
        };
        mgr.init_tables().map_err(|e| format!("Database init failed: {}", e))?;
        mgr.run_settings_migration().map_err(|e| format!("Settings migration failed: {}", e))?;
        Ok(mgr)
    }

    #[allow(dead_code)]
    pub fn new_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory().map_err(|e| format!("Failed to open memory DB: {}", e))?;
        let mgr = DatabaseManager {
            conn: Mutex::new(conn),
        };
        mgr.init_tables().map_err(|e| format!("Database init failed: {}", e))?;
        mgr.run_settings_migration().map_err(|e| format!("Settings migration failed: {}", e))?;
        Ok(mgr)
    }

    pub fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS recent_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                last_modified TEXT NOT NULL,
                snippet TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                pattern TEXT NOT NULL,
                replacement TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS ignored_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                term TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_metadata (
                key TEXT PRIMARY KEY,
                value INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings_migrations (
                schema_version INTEGER PRIMARY KEY,
                schema_version_from INTEGER NOT NULL,
                schema_version_to INTEGER NOT NULL,
                prior_json_payload TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (datetime('now')),
                acknowledged_at TEXT DEFAULT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_migrations_version ON settings_migrations(schema_version)",
            [],
        )?;

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM user_rules",
            [],
            |row| row.get(0),
        )?;

        if count == 0 {
            let defaults = vec![
                ("Cliché: At the end of the day", r"\bAt the end of the day\b", "Ultimately", "style", "Simplify colloquial filler cliché"),
                ("Jargon: Utilize", r"\butilize\b", "use", "clarity", "Replace pompous vocabulary with simpler alternative"),
                ("Filler: In order to", r"\bin order to\b", "to", "conciseness", "Remove redundant prepositional phrase"),
                ("Weak modifier: Very unique", r"\bvery unique\b", "unique", "style", "Unique is an absolute adjective and does not need 'very'"),
            ];

            for (name, pat, rep, cat, desc) in defaults {
                conn.execute(
                    "INSERT INTO user_rules (name, pattern, replacement, category, description, is_active)
                     VALUES (?1, ?2, ?3, ?4, ?5, 1)",
                    params![name, pat, rep, cat, desc],
                )?;
            }
        }

        Ok(())
    }

    // --- Recent Documents ---
    pub fn add_or_update_recent_doc(&self, doc: &DocumentInfo) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO recent_documents (file_path, title, word_count, last_modified, snippet)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(file_path) DO UPDATE SET
                title=excluded.title,
                word_count=excluded.word_count,
                last_modified=excluded.last_modified,
                snippet=excluded.snippet",
            params![
                doc.file_path,
                doc.title,
                doc.word_count as i64,
                doc.last_modified,
                doc.snippet
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_recent_docs(&self, limit: usize) -> Result<Vec<DocumentInfo>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, file_path, title, word_count, last_modified, snippet
                 FROM recent_documents
                 ORDER BY id DESC
                 LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![limit as i64], |row| {
                Ok(DocumentInfo {
                    id: Some(row.get(0)?),
                    file_path: row.get(1)?,
                    title: row.get(2)?,
                    word_count: row.get::<_, i64>(3)? as usize,
                    last_modified: row.get(4)?,
                    snippet: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut docs = Vec::new();
        for d in rows.flatten() {
            docs.push(d);
        }
        Ok(docs)
    }

    // --- User Rules ---
    pub fn get_user_rules(&self) -> Result<Vec<UserRule>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT id, name, pattern, replacement, category, description, is_active FROM user_rules ORDER BY id ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(UserRule {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    pattern: row.get(2)?,
                    replacement: row.get(3)?,
                    category: row.get(4)?,
                    description: row.get(5)?,
                    is_active: row.get::<_, i64>(6)? == 1,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut rules = Vec::new();
        for rule in rows.flatten() {
            rules.push(rule);
        }
        Ok(rules)
    }

    pub fn insert_user_rule(&self, rule: &UserRule) -> Result<i64, String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO user_rules (name, pattern, replacement, category, description, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                rule.name,
                rule.pattern,
                rule.replacement,
                rule.category,
                rule.description,
                if rule.is_active { 1 } else { 0 }
            ],
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }

    pub fn delete_user_rule(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM user_rules WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_user_rule(&self, id: i64, active: bool) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE user_rules SET is_active = ?1 WHERE id = ?2",
            params![if active { 1 } else { 0 }, id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Ignored Terms ---
    pub fn get_ignored_terms(&self) -> Result<Vec<IgnoredTerm>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT id, term, created_at FROM ignored_terms ORDER BY term ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(IgnoredTerm {
                    id: Some(row.get(0)?),
                    term: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for t in rows.flatten() {
            list.push(t);
        }
        Ok(list)
    }

    pub fn add_ignored_term(&self, term: &str) -> Result<i64, String> {
        let conn = self.conn.lock().unwrap();
        let now = "2026-09-02T20:00:00Z";
        conn.execute(
            "INSERT OR IGNORE INTO ignored_terms (term, created_at) VALUES (?1, ?2)",
            params![term.trim().to_lowercase(), now],
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }

    pub fn remove_ignored_term(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ignored_terms WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Settings ---
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT value FROM app_settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let val: String = row.get(0).map_err(|e| e.to_string())?;
            Ok(Some(val))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Settings Migrations ---
    pub fn run_settings_migration(&self) -> Result<(), String> {
        let mut conn = self.conn.lock().unwrap();
        let current_version: i64 = conn
            .query_row(
                "SELECT value FROM schema_metadata WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if current_version >= 1 {
            return Ok(());
        }

        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // Check if user_settings exists in app_settings
        let existing_payload: Option<String> = {
            let mut stmt = tx
                .prepare("SELECT value FROM app_settings WHERE key = 'user_settings'")
                .map_err(|e| e.to_string())?;
            let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
            if let Some(row) = rows.next().map_err(|e| e.to_string())? {
                Some(row.get(0).map_err(|e| e.to_string())?)
            } else {
                None
            }
        };

        if let Some(raw_json) = existing_payload {
            // Record audit row in settings_migrations
            tx.execute(
                "INSERT INTO settings_migrations (schema_version, schema_version_from, schema_version_to, prior_json_payload, applied_at, acknowledged_at)
                 VALUES (?1, ?2, ?3, ?4, datetime('now'), NULL)",
                params![1, 0, 1, raw_json],
            ).map_err(|e| e.to_string())?;

            // Parse and migrate JSON
            if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&raw_json) {
                if let Some(obj) = val.as_object_mut() {
                    obj.insert("provider".to_string(), serde_json::Value::String("local".to_string()));

                    // Model migration: replace vision model with llama3.2:3b, but leave unrecognised non-vision models untouched
                    if let Some(model_val) = obj.get("ollamaModel").and_then(|v| v.as_str()) {
                        let lower = model_val.to_lowercase();
                        if lower.contains("qwen2.5vl") || lower.contains("vision") || lower.contains("-vl") || lower.contains(":vl") || lower.contains("vl:") {
                            obj.insert("ollamaModel".to_string(), serde_json::Value::String("llama3.2:3b".to_string()));
                        }
                    } else {
                        obj.insert("ollamaModel".to_string(), serde_json::Value::String("llama3.2:3b".to_string()));
                    }

                    // Remove legacy keys
                    obj.remove("autoCheckPassive");
                    obj.remove("maxSentenceLengthThreshold");

                    // Ensure language is en_GB if absent
                    if !obj.contains_key("language") {
                        obj.insert("language".to_string(), serde_json::Value::String("en_GB".to_string()));
                    }

                    let updated_json = serde_json::to_string(&val).map_err(|e| e.to_string())?;
                    tx.execute(
                        "UPDATE app_settings SET value = ?1 WHERE key = 'user_settings'",
                        params![updated_json],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }

        // Update schema_metadata
        tx.execute(
            "INSERT INTO schema_metadata (key, value) VALUES ('schema_version', 1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [],
        ).map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_unacknowledged_migration(&self) -> Result<Option<SettingsMigration>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT schema_version, schema_version_from, schema_version_to, prior_json_payload, applied_at, acknowledged_at
                 FROM settings_migrations
                 WHERE acknowledged_at IS NULL
                 ORDER BY schema_version DESC
                 LIMIT 1"
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(SettingsMigration {
                schema_version: row.get(0).map_err(|e| e.to_string())?,
                schema_version_from: row.get(1).map_err(|e| e.to_string())?,
                schema_version_to: row.get(2).map_err(|e| e.to_string())?,
                prior_json_payload: row.get(3).map_err(|e| e.to_string())?,
                applied_at: row.get(4).map_err(|e| e.to_string())?,
                acknowledged_at: row.get(5).map_err(|e| e.to_string())?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn acknowledge_migration(&self, schema_version: i64) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE settings_migrations SET acknowledged_at = datetime('now') WHERE schema_version = ?1",
            params![schema_version],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_db_and_rules() {
        let db = DatabaseManager::new_in_memory().expect("Failed in-memory db init");
        let rules = db.get_user_rules().expect("Failed to get rules");
        assert!(rules.len() >= 4);

        let new_rule = UserRule {
            id: None,
            name: "Custom Test Rule".to_string(),
            pattern: r"\btest\b".to_string(),
            replacement: "exam".to_string(),
            category: "custom".to_string(),
            description: "Replace test with exam".to_string(),
            is_active: true,
        };
        let rule_id = db.insert_user_rule(&new_rule).expect("Failed to insert rule");
        assert!(rule_id > 0);

        db.toggle_user_rule(rule_id, false).expect("Toggle failed");
        let updated_rules = db.get_user_rules().expect("Failed to get rules");
        let found = updated_rules.iter().find(|r| r.id == Some(rule_id)).unwrap();
        assert!(!found.is_active);

        db.delete_user_rule(rule_id).expect("Delete failed");
    }

    #[test]
    fn test_ignored_terms_and_settings() {
        let db = DatabaseManager::new_in_memory().expect("Failed in-memory db init");
        
        let id = db.add_ignored_term("Kubernetes").expect("Failed to add ignored term");
        assert!(id > 0);
        let terms = db.get_ignored_terms().expect("Failed to get terms");
        assert!(terms.iter().any(|t| t.term == "kubernetes"));

        db.set_setting("theme", "dark").expect("Set setting failed");
        let val = db.get_setting("theme").expect("Get setting failed");
        assert_eq!(val, Some("dark".to_string()));
    }

    #[test]
    fn test_migration_idempotence_and_audit() {
        let conn = Connection::open_in_memory().unwrap();
        let mgr = DatabaseManager { conn: Mutex::new(conn) };
        mgr.init_tables().unwrap();

        let old_payload = r#"{"provider":"ollama","ollamaBaseUrl":"http://localhost:11434/v1","ollamaModel":"qwen2.5vl:latest","autoCheckPassive":true,"autoCheckTypography":true,"autoCheckRepetition":true,"maxSentenceLengthThreshold":25}"#;
        mgr.set_setting("user_settings", old_payload).unwrap();

        // First migration run
        mgr.run_settings_migration().unwrap();

        let unack = mgr.get_unacknowledged_migration().unwrap();
        assert!(unack.is_some());
        let audit = unack.unwrap();
        assert_eq!(audit.schema_version, 1);
        assert_eq!(audit.schema_version_from, 0);
        assert_eq!(audit.schema_version_to, 1);
        assert_eq!(audit.prior_json_payload, old_payload);
        assert!(audit.acknowledged_at.is_none());

        let migrated_str = mgr.get_setting("user_settings").unwrap().unwrap();
        let migrated: serde_json::Value = serde_json::from_str(&migrated_str).unwrap();
        assert_eq!(migrated["provider"], "local");
        assert_eq!(migrated["ollamaModel"], "llama3.2:3b");
        assert_eq!(migrated["language"], "en_GB");
        assert!(migrated.get("autoCheckPassive").is_none());
        assert!(migrated.get("maxSentenceLengthThreshold").is_none());
        assert_eq!(migrated["autoCheckTypography"], true);
        assert_eq!(migrated["autoCheckRepetition"], true);

        // Run migration again (idempotency check)
        mgr.run_settings_migration().unwrap();

        // Audit row count should still be exactly 1
        let conn = mgr.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM settings_migrations", [], |row| row.get(0)).unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_migration_preserves_post_migration_changes() {
        let conn = Connection::open_in_memory().unwrap();
        let mgr = DatabaseManager { conn: Mutex::new(conn) };
        mgr.init_tables().unwrap();

        let old_payload = r#"{"provider":"ollama","ollamaModel":"qwen2.5vl:latest"}"#;
        mgr.set_setting("user_settings", old_payload).unwrap();
        mgr.run_settings_migration().unwrap();

        // User changes provider back to ollama post-migration
        let updated_user_payload = r#"{"provider":"ollama","ollamaModel":"llama3.2:3b","theme":"light"}"#;
        mgr.set_setting("user_settings", updated_user_payload).unwrap();

        // Running migration again must NOT overwrite the user's post-migration setting
        mgr.run_settings_migration().unwrap();
        let stored = mgr.get_setting("user_settings").unwrap().unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&stored).unwrap();
        assert_eq!(parsed["provider"], "ollama");
        assert_eq!(parsed["theme"], "light");
    }

    #[test]
    fn test_migration_unrecognised_model_untouched() {
        let conn = Connection::open_in_memory().unwrap();
        let mgr = DatabaseManager { conn: Mutex::new(conn) };
        mgr.init_tables().unwrap();

        let old_payload = r#"{"provider":"ollama","ollamaModel":"mistral:7b-instruct"}"#;
        mgr.set_setting("user_settings", old_payload).unwrap();
        mgr.run_settings_migration().unwrap();

        let stored = mgr.get_setting("user_settings").unwrap().unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&stored).unwrap();
        assert_eq!(parsed["provider"], "local");
        // Non-vision unrecognised model is left untouched
        assert_eq!(parsed["ollamaModel"], "mistral:7b-instruct");
    }

    #[test]
    fn test_migration_interrupted_rollback() {
        let conn = Connection::open_in_memory().unwrap();
        let mgr = DatabaseManager { conn: Mutex::new(conn) };
        mgr.init_tables().unwrap();

        let old_payload = r#"{"provider":"ollama","ollamaModel":"qwen2.5vl:latest"}"#;
        mgr.set_setting("user_settings", old_payload).unwrap();

        // Manually simulate a failure inside transaction:
        // Attempt to insert duplicate schema_version in settings_migrations to force unique constraint error
        {
            let mut conn_guard = mgr.conn.lock().unwrap();
            let tx = conn_guard.transaction().unwrap();
            tx.execute(
                "INSERT INTO settings_migrations (schema_version, schema_version_from, schema_version_to, prior_json_payload, applied_at)
                 VALUES (1, 0, 1, 'dummy', datetime('now'))",
                [],
            ).unwrap();
            tx.commit().unwrap();
        }

        // Now run_settings_migration should fail due to unique constraint on schema_version=1
        let result = mgr.run_settings_migration();
        assert!(result.is_err(), "Migration must error when unique constraint violated");

        // Verify schema_version in schema_metadata was NOT set to 1
        let conn_guard = mgr.conn.lock().unwrap();
        let ver: i64 = conn_guard.query_row(
            "SELECT value FROM schema_metadata WHERE key = 'schema_version'",
            [],
            |r| r.get(0),
        ).unwrap_or(0);
        assert_eq!(ver, 0, "Schema version must remain 0 after rollback");

        // Old settings row must remain unmutated
        drop(conn_guard);
        let stored = mgr.get_setting("user_settings").unwrap().unwrap();
        assert_eq!(stored, old_payload);
    }

    #[test]
    fn test_migration_acknowledgement() {
        let conn = Connection::open_in_memory().unwrap();
        let mgr = DatabaseManager { conn: Mutex::new(conn) };
        mgr.init_tables().unwrap();

        let old_payload = r#"{"provider":"ollama","ollamaModel":"qwen2.5vl:latest"}"#;
        mgr.set_setting("user_settings", old_payload).unwrap();
        mgr.run_settings_migration().unwrap();

        let unack = mgr.get_unacknowledged_migration().unwrap();
        assert!(unack.is_some());
        assert_eq!(unack.unwrap().schema_version, 1);

        mgr.acknowledge_migration(1).unwrap();

        let after_ack = mgr.get_unacknowledged_migration().unwrap();
        assert!(after_ack.is_none());
    }

    #[test]
    fn test_live_db_migration() {
        let mgr = DatabaseManager::new().expect("Failed to initialize DatabaseManager on live database");
        let version: i64 = {
            let conn = mgr.conn.lock().unwrap();
            conn.query_row(
                "SELECT value FROM schema_metadata WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            ).expect("schema_version query failed")
        };
        assert_eq!(version, 1);

        // On a completely fresh database, no legacy settings exist to migrate.
        // Therefore, we shouldn't have an unacknowledged audit row.
        let unack = mgr.get_unacknowledged_migration().expect("Failed to query unacknowledged migration");
        assert!(unack.is_none(), "Expected no migration audit row on a fresh database");
    }
}
