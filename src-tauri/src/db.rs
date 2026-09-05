use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use crate::models::{DocumentInfo, IgnoredTerm, UserRule};

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
        Ok(mgr)
    }

    #[allow(dead_code)]
    pub fn new_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory().map_err(|e| format!("Failed to open memory DB: {}", e))?;
        let mgr = DatabaseManager {
            conn: Mutex::new(conn),
        };
        mgr.init_tables().map_err(|e| format!("Database init failed: {}", e))?;
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
}
