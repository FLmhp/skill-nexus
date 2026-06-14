use crate::db::models::Tool;
use crate::modules::scanner;
use crate::state::AppState;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

fn now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

// ── List ──

#[tauri::command]
pub async fn list_tools(state: State<'_, AppState>) -> Result<Vec<Tool>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, display_name, description, install_path, config_dir,
                    deploy_method, config_format, version, icon, is_active,
                    last_detected, created_at, updated_at
             FROM tools ORDER BY display_name",
        )
        .map_err(|e| e.to_string())?;

    let tools = stmt
        .query_map([], map_tool_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tools)
}

fn map_tool_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Tool> {
    Ok(Tool {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        description: row.get(3)?,
        install_path: row.get(4)?,
        config_dir: row.get(5)?,
        deploy_method: row.get(6)?,
        config_format: row.get(7)?,
        version: row.get(8)?,
        icon: row.get(9)?,
        is_active: row.get::<_, i32>(10)? != 0,
        last_detected: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

// ── Detect ──

#[tauri::command]
pub async fn detect_tools(state: State<'_, AppState>) -> Result<Vec<Tool>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    let timestamp = now();

    let home = scanner::get_home_dir().ok_or("Cannot determine home directory")?;
    let detected = scanner::scan_for_tools(&home);

    let mut tools = Vec::new();

    for dt in &detected {
        let full_path = home.join(&dt.config_dir);
        let path_str = full_path.to_string_lossy().to_string();

        // Check if tool already exists in DB
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM tools WHERE name = ?1",
                [&dt.name],
                |r| r.get(0),
            )
            .ok();

        if let Some(existing_id) = existing {
            // Update last_detected
            conn.execute(
                "UPDATE tools SET last_detected = ?1, install_path = ?2, config_dir = ?3, updated_at = ?4 WHERE id = ?5",
                rusqlite::params![timestamp, path_str, dt.config_dir, timestamp, existing_id],
            )
            .map_err(|e| e.to_string())?;

            // Return refreshed tool
            let tool = conn
                .query_row("SELECT id, name, display_name, description, install_path, config_dir, deploy_method, config_format, version, icon, is_active, last_detected, created_at, updated_at FROM tools WHERE id = ?1",
                    [&existing_id], map_tool_row)
                .map_err(|e| e.to_string())?;
            tools.push(tool);
        } else {
            // Insert new tool
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tools (id, name, display_name, description, install_path, config_dir, deploy_method, config_format, is_active, last_detected, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,'symlink','markdown',1,?7,?8,?9)",
                rusqlite::params![id, dt.name, dt.display_name, "", path_str, dt.config_dir, timestamp, timestamp, timestamp],
            )
            .map_err(|e| e.to_string())?;

            let tool = conn
                .query_row("SELECT id, name, display_name, description, install_path, config_dir, deploy_method, config_format, version, icon, is_active, last_detected, created_at, updated_at FROM tools WHERE id = ?1",
                    [&id], map_tool_row)
                .map_err(|e| e.to_string())?;
            tools.push(tool);
        }
    }

    log::info!("Detected {} AI tools in {:?}", tools.len(), home);
    Ok(tools)
}

// ── CRUD ──

#[derive(Debug, Deserialize)]
pub struct CreateToolInput {
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub install_path: String,
    pub config_dir: Option<String>,
    pub deploy_method: Option<String>,
    pub config_format: Option<String>,
}

#[tauri::command]
pub async fn add_tool(
    state: State<'_, AppState>,
    input: CreateToolInput,
) -> Result<Tool, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let timestamp = now();
    let config_dir = input.config_dir.unwrap_or_else(|| format!(".{}", input.name));
    let deploy_method = input.deploy_method.unwrap_or_else(|| "symlink".to_string());
    let config_format = input.config_format.unwrap_or_else(|| "markdown".to_string());

    conn.execute(
        "INSERT INTO tools (id, name, display_name, description, install_path, config_dir, deploy_method, config_format, is_active, last_detected, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,1,?9,?10,?11)",
        rusqlite::params![id, input.name, input.display_name, input.description.unwrap_or_default(), input.install_path, config_dir, deploy_method, config_format, timestamp, timestamp, timestamp],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, display_name, description, install_path, config_dir, deploy_method, config_format, version, icon, is_active, last_detected, created_at, updated_at FROM tools WHERE id = ?1",
        [&id], map_tool_row,
    )
    .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct UpdateToolInput {
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub install_path: Option<String>,
    pub config_dir: Option<String>,
    pub deploy_method: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub async fn update_tool(
    state: State<'_, AppState>,
    id: String,
    input: UpdateToolInput,
) -> Result<Tool, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    let timestamp = now();

    if let Some(name) = &input.display_name {
        conn.execute("UPDATE tools SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, timestamp, id]).map_err(|e| e.to_string())?;
    }
    if let Some(desc) = &input.description {
        conn.execute("UPDATE tools SET description = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![desc, timestamp, id]).map_err(|e| e.to_string())?;
    }
    if let Some(path) = &input.install_path {
        conn.execute("UPDATE tools SET install_path = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![path, timestamp, id]).map_err(|e| e.to_string())?;
    }
    if let Some(cd) = &input.config_dir {
        conn.execute("UPDATE tools SET config_dir = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![cd, timestamp, id]).map_err(|e| e.to_string())?;
    }
    if let Some(dm) = &input.deploy_method {
        conn.execute("UPDATE tools SET deploy_method = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![dm, timestamp, id]).map_err(|e| e.to_string())?;
    }
    if let Some(active) = input.is_active {
        conn.execute("UPDATE tools SET is_active = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![active as i32, timestamp, id]).map_err(|e| e.to_string())?;
    }

    conn.query_row(
        "SELECT id, name, display_name, description, install_path, config_dir, deploy_method, config_format, version, icon, is_active, last_detected, created_at, updated_at FROM tools WHERE id = ?1",
        [&id], map_tool_row,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_tool(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    // Clean up deployments for this tool
    conn.execute("DELETE FROM deployments WHERE tool_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM tools WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
