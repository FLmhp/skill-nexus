use crate::modules::symlink;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

fn now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

// ── DTOs ──

#[derive(Debug, Serialize, Deserialize)]
pub struct DeploymentDTO {
    pub id: String,
    pub skill_id: String,
    pub tool_id: String,
    pub deploy_path: Option<String>,
    pub deploy_method: String,
    pub status: String,
    pub version_deployed: Option<i32>,
    pub last_synced_at: Option<String>,
    pub error_message: Option<String>,
    pub deployed_at: String,
}

#[derive(Debug, Serialize)]
pub struct DeploymentStatusDTO {
    pub skill_id: String,
    pub skill_name: String,
    pub tool_name: String,
    pub status: String,
}

// ── Deploy ──

#[tauri::command]
pub async fn deploy_skill(
    state: State<'_, AppState>,
    skill_id: String,
    tool_id: String,
    method: Option<String>,
) -> Result<DeploymentDTO, String> {
    do_deploy_skill(&state, skill_id, tool_id, method).await
}

// Shared deployment logic — called by bulk/sync/deploy_all_active
async fn do_deploy_skill(
    state: &State<'_, AppState>,
    skill_id: String,
    tool_id: String,
    method: Option<String>,
) -> Result<DeploymentDTO, String> {
    let db = state.db.clone();
    let config = state.config.read().await;
    let conn = db.get().map_err(|e| e.to_string())?;

    // Fetch skill
    let (skill_name, skill_content, skill_version): (String, String, i32) = conn
        .query_row(
            "SELECT name, content, version FROM skills WHERE id = ?1",
            [&skill_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("Skill not found: {}", e))?;

    // Fetch tool
    let (_tool_name, install_path, config_dir, tool_deploy_method): (
        String, String, Option<String>, String,
    ) = conn
        .query_row(
            "SELECT display_name, install_path, config_dir, deploy_method FROM tools WHERE id = ?1",
            [&tool_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| format!("Tool not found: {}", e))?;

    let deploy_method_str = method.unwrap_or(tool_deploy_method);
    let dm = match deploy_method_str.as_str() {
        "copy" => symlink::DeployMethod::Copy,
        _ => symlink::DeployMethod::Symlink,
    };

    // Resolve target path
    let target_dir = if let Some(cd) = &config_dir {
        std::path::PathBuf::from(&install_path).join(cd)
    } else {
        std::path::PathBuf::from(&install_path).join(".skills-nexus")
    };
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let skill_filename = format!("{}.md", sanitize_filename(&skill_name));
    let target_path = target_dir.join(&skill_filename);

    // Write skill to hub first (source of truth)
    let hub_skills = config.hub_path.join("skills");
    std::fs::create_dir_all(&hub_skills).map_err(|e| e.to_string())?;
    let source_path = hub_skills.join(&skill_filename);
    std::fs::write(&source_path, &skill_content).map_err(|e| e.to_string())?;

    // Deploy using symlink or copy
    let result = symlink::deploy_skill(&source_path, &target_path, dm);

    let timestamp = now();
    let deploy_path = target_path.to_string_lossy().to_string();

    // Check if deployment already exists
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM deployments WHERE skill_id = ?1 AND tool_id = ?2",
            rusqlite::params![skill_id, tool_id],
            |r| r.get(0),
        )
        .ok();

    match result {
        Ok(()) => {
            if let Some(dep_id) = existing {
                conn.execute(
                    "UPDATE deployments SET deploy_path=?1, deploy_method=?2, status='active', version_deployed=?3, last_synced_at=?4, error_message=NULL WHERE id=?5",
                    rusqlite::params![deploy_path, deploy_method_str, skill_version, timestamp, dep_id],
                ).map_err(|e| e.to_string())?;

                get_deployment_by_id(&conn, &dep_id)
            } else {
                let id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO deployments (id, skill_id, tool_id, deploy_path, deploy_method, status, version_deployed, last_synced_at, deployed_at)
                     VALUES (?1,?2,?3,?4,?5,'active',?6,?7,?8)",
                    rusqlite::params![id, skill_id, tool_id, deploy_path, deploy_method_str, skill_version, timestamp, timestamp],
                ).map_err(|e| e.to_string())?;

                // Log usage
                conn.execute(
                    "INSERT INTO usage_logs (id, skill_id, tool_id, action, context, timestamp)
                     VALUES (?1,?2,?3,'deployed','{}',?4)",
                    rusqlite::params![Uuid::new_v4().to_string(), skill_id, tool_id, timestamp],
                ).map_err(|e| e.to_string())?;

                get_deployment_by_id(&conn, &id)
            }
        }
        Err(e) => {
            let err_msg = format!("Deployment failed: {}", e);
            if let Some(dep_id) = existing {
                conn.execute(
                    "UPDATE deployments SET status='error', error_message=?1, last_synced_at=?2 WHERE id=?3",
                    rusqlite::params![err_msg, timestamp, dep_id],
                ).map_err(|e| e.to_string())?;
                get_deployment_by_id(&conn, &dep_id)
            } else {
                Err(err_msg)
            }
        }
    }
}

// ── Undeploy ──

#[tauri::command]
pub async fn undeploy_skill(
    state: State<'_, AppState>,
    skill_id: String,
    tool_id: String,
) -> Result<(), String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    // Get deployment info
    let (dep_id, deploy_path): (String, Option<String>) = conn
        .query_row(
            "SELECT id, deploy_path FROM deployments WHERE skill_id = ?1 AND tool_id = ?2",
            rusqlite::params![skill_id, tool_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Deployment not found: {}", e))?;

    // Remove the file/link
    if let Some(path) = &deploy_path {
        let p = std::path::PathBuf::from(path);
        let _ = symlink::remove_deployment(&p);
    }

    // Log usage
    let timestamp = now();
    conn.execute(
        "INSERT INTO usage_logs (id, skill_id, tool_id, action, context, timestamp)
         VALUES (?1,?2,?3,'undeployed','{}',?4)",
        rusqlite::params![Uuid::new_v4().to_string(), skill_id, tool_id, timestamp],
    ).map_err(|e| e.to_string())?;

    // Remove deployment record
    conn.execute("DELETE FROM deployments WHERE id = ?1", [&dep_id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Sync ──

#[tauri::command]
pub async fn sync_deployment(
    state: State<'_, AppState>,
    skill_id: String,
    tool_id: String,
) -> Result<DeploymentDTO, String> {
    let method = {
        let db = state.db.clone();
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT deploy_method FROM deployments WHERE skill_id = ?1 AND tool_id = ?2",
            rusqlite::params![skill_id, tool_id],
            |r| r.get::<_, String>(0),
        )
        .ok()
    };

    do_deploy_skill(&state, skill_id, tool_id, method).await
}

// ── Bulk Operations ──

#[tauri::command]
pub async fn bulk_deploy(
    state: State<'_, AppState>,
    skill_ids: Vec<String>,
    tool_id: String,
    method: Option<String>,
) -> Result<Vec<DeploymentDTO>, String> {
    let mut results = Vec::new();
    for skill_id in &skill_ids {
        match do_deploy_skill(&state, skill_id.clone(), tool_id.clone(), method.clone()).await {
            Ok(dto) => results.push(dto),
            Err(e) => log::warn!("Failed to deploy skill {}: {}", skill_id, e),
        }
    }
    Ok(results)
}

#[tauri::command]
pub async fn deploy_all_active(
    state: State<'_, AppState>,
    tool_id: String,
) -> Result<Vec<DeploymentDTO>, String> {
    let skill_ids = get_active_skill_ids(&state).await?;

    let mut results = Vec::new();
    for skill_id in &skill_ids {
        match do_deploy_skill(&state, skill_id.clone(), tool_id.clone(), None).await {
            Ok(dto) => results.push(dto),
            Err(e) => log::warn!("Failed to deploy skill {}: {}", skill_id, e),
        }
    }
    Ok(results)
}

async fn get_active_skill_ids(state: &State<'_, AppState>) -> Result<Vec<String>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id FROM skills WHERE is_active = 1")
        .map_err(|e| e.to_string())?;
    let result: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

// ── Status ──

#[tauri::command]
pub async fn get_deployment_status(
    state: State<'_, AppState>,
) -> Result<Vec<DeploymentStatusDTO>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT skill_id, skill_name, tool_name, deploy_status
             FROM v_skill_deployment_status",
        )
        .map_err(|e| e.to_string())?;

    let deployments = stmt
        .query_map([], |row| {
            Ok(DeploymentStatusDTO {
                skill_id: row.get(0)?,
                skill_name: row.get(1)?,
                tool_name: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                status: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "not_deployed".to_string()),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(deployments)
}

#[tauri::command]
pub async fn get_deployments(
    state: State<'_, AppState>,
    skill_id: Option<String>,
    tool_id: Option<String>,
) -> Result<Vec<DeploymentDTO>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let (sql, params): (String, Vec<String>) = if let Some(sid) = &skill_id {
        if let Some(tid) = &tool_id {
            (
                "SELECT id, skill_id, tool_id, deploy_path, deploy_method, status, version_deployed, last_synced_at, error_message, deployed_at FROM deployments WHERE skill_id = ?1 AND tool_id = ?2".to_string(),
                vec![sid.clone(), tid.clone()],
            )
        } else {
            (
                "SELECT id, skill_id, tool_id, deploy_path, deploy_method, status, version_deployed, last_synced_at, error_message, deployed_at FROM deployments WHERE skill_id = ?1".to_string(),
                vec![sid.clone()],
            )
        }
    } else if let Some(tid) = &tool_id {
        (
            "SELECT id, skill_id, tool_id, deploy_path, deploy_method, status, version_deployed, last_synced_at, error_message, deployed_at FROM deployments WHERE tool_id = ?1".to_string(),
            vec![tid.clone()],
        )
    } else {
        (
            "SELECT id, skill_id, tool_id, deploy_path, deploy_method, status, version_deployed, last_synced_at, error_message, deployed_at FROM deployments".to_string(),
            vec![],
        )
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();

    let results = stmt
        .query_map(param_refs.as_slice(), map_deployment_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(results)
}

// ── Helpers ──

fn map_deployment_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<DeploymentDTO> {
    Ok(DeploymentDTO {
        id: row.get(0)?,
        skill_id: row.get(1)?,
        tool_id: row.get(2)?,
        deploy_path: row.get(3)?,
        deploy_method: row.get(4)?,
        status: row.get(5)?,
        version_deployed: row.get(6)?,
        last_synced_at: row.get(7)?,
        error_message: row.get(8)?,
        deployed_at: row.get(9)?,
    })
}

fn get_deployment_by_id(
    conn: &r2d2::PooledConnection<r2d2_sqlite::SqliteConnectionManager>,
    id: &str,
) -> Result<DeploymentDTO, String> {
    conn.query_row(
        "SELECT id, skill_id, tool_id, deploy_path, deploy_method, status, version_deployed, last_synced_at, error_message, deployed_at FROM deployments WHERE id = ?1",
        [id],
        map_deployment_row,
    )
    .map_err(|e| e.to_string())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
        .collect::<String>()
        .trim()
        .replace(' ', "-")
}
