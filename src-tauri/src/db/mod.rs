use rusqlite::Connection;
use tauri::Manager;

pub mod agents;
pub mod config;
pub mod mcp;
pub mod scans;
pub mod skills;

pub fn get_conn(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("skill_nexus.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn init_db(app: &tauri::AppHandle) -> Result<(), String> {
    let conn = get_conn(app)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL UNIQUE,
            source_type TEXT NOT NULL DEFAULT 'local',
            source_url TEXT,
            version TEXT,
            author TEXT,
            license TEXT,
            installed_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata_json TEXT,
            file_count INTEGER NOT NULL DEFAULT 0,
            agent_type TEXT
        );

        CREATE TABLE IF NOT EXISTS skill_relations (
            id TEXT PRIMARY KEY,
            source_skill_id TEXT NOT NULL,
            target_skill_id TEXT NOT NULL,
            relation_type TEXT NOT NULL DEFAULT 'related',
            FOREIGN KEY (source_skill_id) REFERENCES skills(id) ON DELETE CASCADE,
            FOREIGN KEY (target_skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#6366f1',
            group_id TEXT
        );

        CREATE TABLE IF NOT EXISTS tag_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS skill_tags (
            skill_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (skill_id, tag_id),
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            agent_type TEXT NOT NULL,
            skills_path TEXT NOT NULL,
            config_path TEXT,
            icon TEXT,
            enabled INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS agent_skills (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            sync_type TEXT NOT NULL DEFAULT 'copy',
            enabled INTEGER NOT NULL DEFAULT 0,
            synced_at TEXT,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mcp_servers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            transport_type TEXT NOT NULL DEFAULT 'stdio',
            command TEXT,
            args_json TEXT,
            env_json TEXT,
            url TEXT,
            enabled INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS scan_results (
            id TEXT PRIMARY KEY,
            skill_id TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            risk_score INTEGER NOT NULL DEFAULT 0,
            risk_severity TEXT NOT NULL DEFAULT 'LOW',
            recommendation TEXT NOT NULL DEFAULT '',
            findings_json TEXT NOT NULL DEFAULT '[]',
            components_scanned INTEGER NOT NULL DEFAULT 0,
            scanned_at TEXT NOT NULL,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    insert_default_agents(&conn)?;

    Ok(())
}

fn expand_tilde(path: &str) -> String {
    if !path.starts_with('~') {
        return path.to_string();
    }
    let home = if cfg!(windows) {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };
    if home.is_empty() {
        return path.to_string();
    }
    path.replacen('~', &home, 1)
}

pub fn insert_default_agents(conn: &Connection) -> Result<(), String> {
    let defaults: Vec<(&str, &str, &str, &str)> = vec![
        ("claude-code", "Claude Code", "claude", "~/.claude/skills/"),
        ("codex", "Codex", "codex", "~/.codex/skills/"),
        (
            "opencode",
            "OpenCode",
            "opencode",
            "~/.config/opencode/skills/",
        ),
        ("cursor", "Cursor", "cursor", "~/.cursor/skills/"),
        ("gemini-cli", "Gemini CLI", "gemini", "~/.gemini/skills/"),
        (
            "codebuddy",
            "CodeBuddy",
            "codebuddy",
            "~/.codebuddy/skills/",
        ),
        ("kiro", "Kiro", "kiro", "~/.kiro/skills/"),
        ("qwen", "Qwen", "qwen", "~/.qwen/skills/"),
    ];

    for (id, name, agent_type, skills_path) in defaults {
        let expanded_path = expand_tilde(skills_path);
        conn.execute(
            "INSERT OR IGNORE INTO agents (id, name, agent_type, skills_path, enabled) VALUES (?1, ?2, ?3, ?4, 1)",
            rusqlite::params![id, name, agent_type, expanded_path],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
