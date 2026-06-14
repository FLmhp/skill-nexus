use crate::db::models::SystemInfo;
use crate::modules::backup;
use crate::state::AppState;
use serde::Deserialize;
use tauri::State;
use std::path::PathBuf;

#[tauri::command]
pub async fn get_app_config(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let config = state.config.read().await;
    Ok(serde_json::json!({
        "hub_path": config.hub_path.to_string_lossy(),
        "theme": config.theme,
        "language": config.language,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateConfigInput {
    pub theme: Option<String>,
    pub language: Option<String>,
}

#[tauri::command]
pub async fn update_app_config(
    state: State<'_, AppState>,
    input: UpdateConfigInput,
) -> Result<(), String> {
    let mut config = state.config.write().await;
    if let Some(theme) = input.theme {
        config.theme = theme;
    }
    if let Some(language) = input.language {
        config.language = language;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_system_info(state: State<'_, AppState>) -> Result<SystemInfo, String> {
    let config = state.config.read().await;
    let db = state.db.clone();

    let db_size = std::fs::metadata(&config.db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let skills_count: i64 = {
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.query_row("SELECT COUNT(*) FROM skills", [], |r| r.get(0))
            .unwrap_or(0)
    };

    let tools_count: i64 = {
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.query_row("SELECT COUNT(*) FROM tools", [], |r| r.get(0))
            .unwrap_or(0)
    };

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        db_size_bytes: db_size,
        skills_count,
        tools_count,
        hub_path: config.hub_path.to_string_lossy().to_string(),
    })
}

// ── Backup / Restore ──

#[tauri::command]
pub async fn create_backup(
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<String, String> {
    let config = state.config.read().await;
    let backup_dir = match path {
        Some(p) => PathBuf::from(p),
        None => config.hub_path.join("backups"),
    };

    backup::create_backup(&config.hub_path, &config.db_path, &backup_dir)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_backup(
    state: State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let backup_path = PathBuf::from(&path);
    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", path));
    }

    // For now, we support DB file restoration
    // Full zip restoration will be implemented with zip support
    let config = state.config.read().await;

    if backup_path.extension().map_or(false, |e| e == "db") {
        // Restore database
        std::fs::copy(&backup_path, &config.db_path).map_err(|e| e.to_string())?;
        log::info!("Database restored from {:?}", backup_path);
    } else {
        log::info!("Backup file type not supported for automatic restore: {:?}", backup_path);
    }

    Ok(())
}

// ── Legacy Import ──

#[derive(Debug, Deserialize)]
pub enum LegacyFormat {
    SkillsManager,
    SkillsDesktop,
    OhMySkills,
    Skiller,
}

#[tauri::command]
pub async fn import_from_legacy(
    state: State<'_, AppState>,
    source_path: String,
    format: LegacyFormat,
) -> Result<serde_json::Value, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Source path does not exist: {}", source_path));
    }

    let config = state.config.read().await;
    let db = state.db.clone();
    let mut imported = 0;
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    match format {
        LegacyFormat::SkillsManager | LegacyFormat::SkillsDesktop => {
            // Both use .md files in a skills/ directory
            let skills_dir = if source.is_dir() {
                source.join("skills")
            } else {
                source.parent().unwrap_or(&source).to_path_buf()
            };

            if skills_dir.exists() {
                for entry in std::fs::read_dir(&skills_dir).map_err(|e| e.to_string())? {
                    let entry = entry.map_err(|e| e.to_string())?;
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "md") {
                        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
                        let name = path.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("Imported")
                            .to_string();

                        let id = uuid::Uuid::new_v4().to_string();
                        let conn = db.get().map_err(|e| e.to_string())?;
                        conn.execute(
                            "INSERT INTO skills (id, name, description, content, type, category, tags, version, author, format, is_active, created_at, updated_at)
                             VALUES (?1,?2,'','?3,'custom',NULL,'[]',1,'','markdown',1,?4,?5)",
                            rusqlite::params![id, name, content, timestamp, timestamp],
                        )
                        .map_err(|e| e.to_string())?;

                        // Copy to hub
                        let hub_skills = config.hub_path.join("skills");
                        std::fs::create_dir_all(&hub_skills).map_err(|e| e.to_string())?;
                        std::fs::write(hub_skills.join(format!("{}.md", name.replace(' ', "-"))), &content)
                            .map_err(|e| e.to_string())?;

                        imported += 1;
                    }
                }
            }
        }
        LegacyFormat::OhMySkills | LegacyFormat::Skiller => {
            // JSON config-based format
            let config_file = source.join("config.json");
            if config_file.exists() {
                let json_str = std::fs::read_to_string(&config_file).map_err(|e| e.to_string())?;
                if let Ok(config_data) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(skills) = config_data["skills"].as_array() {
                        for skill in skills {
                            if let (Some(name), Some(content)) = (
                                skill["name"].as_str(),
                                skill["content"].as_str(),
                            ) {
                                let id = uuid::Uuid::new_v4().to_string();
                                let conn = db.get().map_err(|e| e.to_string())?;
                                let _ = conn.execute(
                                    "INSERT INTO skills (id, name, content, type, tags, version, author, format, is_active, created_at, updated_at)
                                     VALUES (?1,?2,?3,'custom','[]',1,'','markdown',1,?4,?5)",
                                    rusqlite::params![id, name, content, timestamp, timestamp],
                                );
                                imported += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(serde_json::json!({
        "imported": imported,
        "source": source_path,
        "format": format!("{:?}", format),
    }))
}
