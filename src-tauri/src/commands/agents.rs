use tauri::AppHandle;

use crate::db;
use crate::models::{Agent, AgentSyncFailure, AgentSyncResult};
use crate::services::syncer;

#[tauri::command]
pub async fn get_agents(app: AppHandle) -> Result<Vec<Agent>, String> {
    db::agents::get_all_agents(&app)
}

#[tauri::command]
pub async fn update_agent(app: AppHandle, agent: Agent) -> Result<(), String> {
    db::agents::update_agent(&app, &agent)
}

#[tauri::command]
pub async fn sync_agent_skill(
    app: AppHandle,
    skill_id: String,
    agent_id: String,
    enabled: bool,
) -> Result<AgentSyncResult, String> {
    let conn = db::get_conn(&app)?;
    let mut result = AgentSyncResult {
        agent_id: Some(agent_id.clone()),
        ..AgentSyncResult::default()
    };
    let agent = db::agents::get_agent_by_id(&app, &agent_id)?;
    if !agent.enabled {
        result.skipped = 1;
        result.message = format!("Agent {} is disabled", agent.name);
        return Ok(result);
    }

    if enabled {
        let skill = db::skills::get_skill_by_id(&app, &skill_id)?;

        db::agents::sync_skill_to_agent(&app, &skill_id, &agent_id)?;
        match syncer::sync_skill(&skill.path, &agent.skills_path, "copy") {
            Ok(()) => result.synced = 1,
            Err(error) => {
                result.failed = 1;
                result.failures.push(AgentSyncFailure {
                    skill_id: skill.id,
                    skill_name: skill.name,
                    error,
                });
            }
        }
    } else {
        use rusqlite::params;
        conn.execute(
            "UPDATE agent_skills SET enabled = 0 WHERE skill_id = ?1 AND agent_id = ?2",
            params![skill_id, agent_id],
        )
        .map_err(|e| e.to_string())?;

        let skill = db::skills::get_skill_by_id(&app, &skill_id)?;
        let skill_name = std::path::Path::new(&skill.path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        match syncer::remove_sync(skill_name, &agent.skills_path) {
            Ok(()) => result.synced = 1,
            Err(error) => {
                result.failed = 1;
                result.failures.push(AgentSyncFailure {
                    skill_id: skill.id,
                    skill_name: skill.name,
                    error,
                });
            }
        }
    }
    result.message = format!(
        "Synced {}, failed {}, skipped {}",
        result.synced, result.failed, result.skipped
    );
    Ok(result)
}

#[tauri::command]
pub async fn sync_all_agents(app: AppHandle) -> Result<AgentSyncResult, String> {
    syncer::sync_all(&app)
}

#[tauri::command]
pub async fn sync_agent(app: AppHandle, agent_id: String) -> Result<AgentSyncResult, String> {
    syncer::sync_agent(&app, &agent_id)
}
