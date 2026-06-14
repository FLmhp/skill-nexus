use crate::db;
use crate::models::{Agent, AgentSkill};
use rusqlite::params;

pub fn get_all_agents(app: &tauri::AppHandle) -> Result<Vec<Agent>, String> {
    let conn = db::get_conn(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, agent_type, skills_path, config_path, icon, enabled FROM agents ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let agents = stmt
        .query_map([], |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                agent_type: row.get(2)?,
                skills_path: row.get(3)?,
                config_path: row.get(4)?,
                icon: row.get(5)?,
                enabled: row.get::<_, i32>(6)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Agent>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(agents)
}

pub fn get_agent_by_id(app: &tauri::AppHandle, id: &str) -> Result<Agent, String> {
    let conn = db::get_conn(app)?;
    conn.query_row(
        "SELECT id, name, agent_type, skills_path, config_path, icon, enabled FROM agents WHERE id = ?1",
        params![id],
        |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                agent_type: row.get(2)?,
                skills_path: row.get(3)?,
                config_path: row.get(4)?,
                icon: row.get(5)?,
                enabled: row.get::<_, i32>(6)? != 0,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn insert_agent(app: &tauri::AppHandle, agent: &Agent) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "INSERT OR REPLACE INTO agents (id, name, agent_type, skills_path, config_path, icon, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            agent.id,
            agent.name,
            agent.agent_type,
            agent.skills_path,
            agent.config_path,
            agent.icon,
            agent.enabled as i32,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_agent(app: &tauri::AppHandle, agent: &Agent) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "UPDATE agents SET name = ?1, agent_type = ?2, skills_path = ?3, config_path = ?4, icon = ?5, enabled = ?6 WHERE id = ?7",
        params![
            agent.name,
            agent.agent_type,
            agent.skills_path,
            agent.config_path,
            agent.icon,
            agent.enabled as i32,
            agent.id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_agent_skills(
    app: &tauri::AppHandle,
    agent_id: &str,
) -> Result<Vec<AgentSkill>, String> {
    let conn = db::get_conn(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, agent_id, skill_id, sync_type, enabled, synced_at FROM agent_skills WHERE agent_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let skills = stmt
        .query_map(params![agent_id], |row| {
            Ok(AgentSkill {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                skill_id: row.get(2)?,
                sync_type: row.get(3)?,
                enabled: row.get::<_, i32>(4)? != 0,
                synced_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<AgentSkill>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(skills)
}

pub fn sync_skill_to_agent(
    app: &tauri::AppHandle,
    skill_id: &str,
    agent_id: &str,
) -> Result<(), String> {
    let conn = db::get_conn(app)?;

    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM agent_skills WHERE skill_id = ?1 AND agent_id = ?2",
            params![skill_id, agent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if count > 0 {
        conn.execute(
            "UPDATE agent_skills SET enabled = 1, synced_at = datetime('now') WHERE skill_id = ?1 AND agent_id = ?2",
            params![skill_id, agent_id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO agent_skills (id, agent_id, skill_id, sync_type, enabled, synced_at) VALUES (?1, ?2, ?3, 'copy', 1, datetime('now'))",
            params![id, agent_id, skill_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
