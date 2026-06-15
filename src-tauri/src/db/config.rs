use crate::db;
use crate::models::AppSettings;
use rusqlite::params;

const LANGUAGE_KEY: &str = "language";
const EXTRA_SCAN_PATHS_KEY: &str = "extra_scan_paths";
const AUTO_WATCH_ENABLED_KEY: &str = "auto_watch_enabled";
const DEFAULT_LANGUAGE: &str = "en";

pub fn get_app_settings(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    let language = get_value(app, LANGUAGE_KEY)?.unwrap_or_else(|| DEFAULT_LANGUAGE.to_string());
    let extra_scan_paths = get_value(app, EXTRA_SCAN_PATHS_KEY)?
        .and_then(|value| serde_json::from_str::<Vec<String>>(&value).ok())
        .unwrap_or_default();
    let auto_watch_enabled = get_value(app, AUTO_WATCH_ENABLED_KEY)?
        .map(|value| value == "true")
        .unwrap_or(false);

    Ok(AppSettings {
        language: normalize_language(&language),
        extra_scan_paths,
        auto_watch_enabled,
    })
}

pub fn update_app_settings(
    app: &tauri::AppHandle,
    settings: &AppSettings,
) -> Result<AppSettings, String> {
    let normalized = AppSettings {
        language: normalize_language(&settings.language),
        extra_scan_paths: normalize_scan_paths(&settings.extra_scan_paths),
        auto_watch_enabled: settings.auto_watch_enabled,
    };

    set_value(app, LANGUAGE_KEY, &normalized.language)?;
    let paths_json =
        serde_json::to_string(&normalized.extra_scan_paths).map_err(|e| e.to_string())?;
    set_value(app, EXTRA_SCAN_PATHS_KEY, &paths_json)?;
    set_value(
        app,
        AUTO_WATCH_ENABLED_KEY,
        if normalized.auto_watch_enabled {
            "true"
        } else {
            "false"
        },
    )?;

    Ok(normalized)
}

pub fn clear_app_data(app: &tauri::AppHandle) -> Result<(), String> {
    let mut conn = db::get_conn(app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for table in [
        "scan_results",
        "agent_skills",
        "skill_tags",
        "skill_relations",
        "tags",
        "tag_groups",
        "mcp_servers",
        "skills",
        "config",
        "agents",
    ] {
        tx.execute(&format!("DELETE FROM {table}"), [])
            .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    db::insert_default_agents(&db::get_conn(app)?)?;
    Ok(())
}

fn get_value(app: &tauri::AppHandle, key: &str) -> Result<Option<String>, String> {
    let conn = db::get_conn(app)?;
    let result = conn.query_row(
        "SELECT value FROM config WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn set_value(app: &tauri::AppHandle, key: &str, value: &str) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn normalize_language(language: &str) -> String {
    match language {
        "zh" | "en" => language.to_string(),
        _ => DEFAULT_LANGUAGE.to_string(),
    }
}

fn normalize_scan_paths(paths: &[String]) -> Vec<String> {
    let mut result = Vec::new();
    for path in paths {
        let trimmed = path.trim();
        if trimmed.is_empty() || result.iter().any(|p| p == trimmed) {
            continue;
        }
        result.push(trimmed.to_string());
    }
    result
}
