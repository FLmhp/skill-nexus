use tauri::AppHandle;

use crate::db;
use crate::models::Agent;
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
) -> Result<(), String> {
    let conn = db::get_conn(&app)?;
    if enabled {
        let skill = db::skills::get_skill_by_id(&app, &skill_id)?;
        let agent = db::agents::get_agent_by_id(&app, &agent_id)?;

        db::agents::sync_skill_to_agent(&app, &skill_id, &agent_id)?;
        syncer::sync_skill(&skill.path, &agent.skills_path, "copy")?;
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
        let agent = db::agents::get_agent_by_id(&app, &agent_id)?;
        let _ = syncer::remove_sync(skill_name, &agent.skills_path);
    }
    Ok(())
}

#[tauri::command]
pub async fn sync_all_agents(app: AppHandle) -> Result<String, String> {
    syncer::sync_all(&app)?;
    Ok("All agents synced successfully".to_string())
}
