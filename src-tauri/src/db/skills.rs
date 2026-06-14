use crate::db;
use crate::models::{GraphData, GraphEdge, GraphNode, Skill, SkillRelation};
use rusqlite::params;

pub fn get_all_skills(app: &tauri::AppHandle) -> Result<Vec<Skill>, String> {
    let conn = db::get_conn(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, path, source_type, source_url, version, author, license, installed_at, updated_at, metadata_json, file_count, agent_type FROM skills ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let skills = stmt
        .query_map([], |row| {
            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                path: row.get(3)?,
                source_type: row.get(4)?,
                source_url: row.get(5)?,
                version: row.get(6)?,
                author: row.get(7)?,
                license: row.get(8)?,
                installed_at: row.get(9)?,
                updated_at: row.get(10)?,
                metadata_json: row.get(11)?,
                file_count: row.get(12)?,
                agent_type: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Skill>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(skills)
}

pub fn get_skill_by_id(app: &tauri::AppHandle, id: &str) -> Result<Skill, String> {
    let conn = db::get_conn(app)?;
    conn.query_row(
        "SELECT id, name, description, path, source_type, source_url, version, author, license, installed_at, updated_at, metadata_json, file_count, agent_type FROM skills WHERE id = ?1",
        params![id],
        |row| {
            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                path: row.get(3)?,
                source_type: row.get(4)?,
                source_url: row.get(5)?,
                version: row.get(6)?,
                author: row.get(7)?,
                license: row.get(8)?,
                installed_at: row.get(9)?,
                updated_at: row.get(10)?,
                metadata_json: row.get(11)?,
                file_count: row.get(12)?,
                agent_type: row.get(13)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn insert_skill(app: &tauri::AppHandle, skill: &Skill) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "INSERT OR REPLACE INTO skills (id, name, description, path, source_type, source_url, version, author, license, installed_at, updated_at, metadata_json, file_count, agent_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            skill.id,
            skill.name,
            skill.description,
            skill.path,
            skill.source_type,
            skill.source_url,
            skill.version,
            skill.author,
            skill.license,
            skill.installed_at,
            skill.updated_at,
            skill.metadata_json,
            skill.file_count,
            skill.agent_type,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_skill(app: &tauri::AppHandle, skill: &Skill) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "UPDATE skills SET name = ?1, description = ?2, path = ?3, source_type = ?4, source_url = ?5, version = ?6, author = ?7, license = ?8, updated_at = ?9, metadata_json = ?10, file_count = ?11, agent_type = ?12 WHERE id = ?13",
        params![
            skill.name,
            skill.description,
            skill.path,
            skill.source_type,
            skill.source_url,
            skill.version,
            skill.author,
            skill.license,
            skill.updated_at,
            skill.metadata_json,
            skill.file_count,
            skill.agent_type,
            skill.id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_skill(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "DELETE FROM skill_tags WHERE skill_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM skill_relations WHERE source_skill_id = ?1 OR target_skill_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM agent_skills WHERE skill_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM scan_results WHERE skill_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM skills WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_skill_relations(
    app: &tauri::AppHandle,
    skill_id: &str,
) -> Result<Vec<SkillRelation>, String> {
    let conn = db::get_conn(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, source_skill_id, target_skill_id, relation_type FROM skill_relations WHERE source_skill_id = ?1 OR target_skill_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let relations = stmt
        .query_map(params![skill_id], |row| {
            Ok(SkillRelation {
                id: row.get(0)?,
                source_skill_id: row.get(1)?,
                target_skill_id: row.get(2)?,
                relation_type: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<SkillRelation>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(relations)
}

pub fn insert_relation(app: &tauri::AppHandle, relation: &SkillRelation) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "INSERT OR REPLACE INTO skill_relations (id, source_skill_id, target_skill_id, relation_type) VALUES (?1, ?2, ?3, ?4)",
        params![
            relation.id,
            relation.source_skill_id,
            relation.target_skill_id,
            relation.relation_type,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_graph_data(app: &tauri::AppHandle) -> Result<GraphData, String> {
    let skills = get_all_skills(app)?;
    let conn = db::get_conn(app)?;

    let mut nodes: Vec<GraphNode> = Vec::new();
    for skill in &skills {
        let data = serde_json::json!({
            "description": skill.description,
            "path": skill.path,
            "version": skill.version,
            "author": skill.author,
            "agent_type": skill.agent_type,
        });
        nodes.push(GraphNode {
            id: skill.id.clone(),
            label: skill.name.clone(),
            node_type: "skill".to_string(),
            group: skill.agent_type.clone(),
            data,
        });
    }

    let mut stmt = conn
        .prepare("SELECT id, source_skill_id, target_skill_id, relation_type FROM skill_relations")
        .map_err(|e| e.to_string())?;

    let edges = stmt
        .query_map([], |row| {
            Ok(GraphEdge {
                id: row.get(0)?,
                source: row.get(1)?,
                target: row.get(2)?,
                relation_type: row.get(3)?,
                label: None,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<GraphEdge>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(GraphData { nodes, edges })
}
