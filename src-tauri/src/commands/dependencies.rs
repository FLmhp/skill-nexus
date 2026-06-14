use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ── DTOs ──

#[derive(Debug, Serialize)]
pub struct GraphDTO {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub category: Option<String>,
    pub r#type: String,
    pub version: i32,
}

#[derive(Debug, Serialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub r#type: String,
}

#[derive(Debug, Serialize)]
pub struct DependencyDTO {
    pub id: String,
    pub skill_id: String,
    pub depends_on_id: String,
    pub dep_type: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ImpactAnalysisDTO {
    pub skill_id: String,
    pub skill_name: String,
    pub direct_dependents: Vec<String>,
    pub transitive_dependents: Vec<String>,
    pub would_break_if_removed: Vec<String>,
    pub total_impacted: i64,
}

// ── Full Graph ──

#[tauri::command]
pub async fn get_full_dependency_graph(state: State<'_, AppState>) -> Result<GraphDTO, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, category, type, version FROM skills WHERE is_active = 1")
        .map_err(|e| e.to_string())?;

    let nodes: Vec<GraphNode> = stmt
        .query_map([], |row| {
            Ok(GraphNode {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                r#type: row.get(3)?,
                version: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT skill_id, depends_on_id, dep_type FROM skill_dependencies")
        .map_err(|e| e.to_string())?;

    let edges: Vec<GraphEdge> = stmt
        .query_map([], |row| {
            Ok(GraphEdge {
                source: row.get(0)?,
                target: row.get(1)?,
                r#type: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(GraphDTO { nodes, edges })
}

// ── Per-Skill Dependencies ──

#[tauri::command]
pub async fn get_skill_dependencies(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<Vec<DependencyDTO>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, skill_id, depends_on_id, dep_type, created_at
             FROM skill_dependencies WHERE skill_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let deps = stmt
        .query_map([&skill_id], |row| {
            Ok(DependencyDTO {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                depends_on_id: row.get(2)?,
                dep_type: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(deps)
}

// ── Add Dependency ──

#[derive(Debug, Deserialize)]
pub enum DependencyType {
    Imports,
    Extends,
    Requires,
    Conflicts,
}

#[tauri::command]
pub async fn add_dependency(
    state: State<'_, AppState>,
    skill_id: String,
    depends_on_id: String,
    dep_type: DependencyType,
) -> Result<DependencyDTO, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    // Validate: can't depend on self
    if skill_id == depends_on_id {
        return Err("A skill cannot depend on itself".to_string());
    }

    // Validate: both skills exist
    let skill_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM skills WHERE id = ?1",
            [&skill_id],
            |r| r.get(0),
        )
        .unwrap_or(false);
    let target_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM skills WHERE id = ?1",
            [&depends_on_id],
            |r| r.get(0),
        )
        .unwrap_or(false);

    if !skill_exists || !target_exists {
        return Err("One or both skills not found".to_string());
    }

    // Check for existing dependency
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM skill_dependencies WHERE skill_id = ?1 AND depends_on_id = ?2",
            rusqlite::params![skill_id, depends_on_id],
            |r| r.get(0),
        )
        .ok();

    if let Some(existing_id) = existing {
        // Return existing
        conn.query_row(
            "SELECT id, skill_id, depends_on_id, dep_type, created_at FROM skill_dependencies WHERE id = ?1",
            [&existing_id],
            map_dep_row,
        )
        .map_err(|e| e.to_string())
    } else {
        // Check for circular dependency before inserting
        if would_create_cycle(&conn, &skill_id, &depends_on_id)? {
            return Err("Adding this dependency would create a circular reference".to_string());
        }

        let id = Uuid::new_v4().to_string();
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let dt_str = format!("{:?}", dep_type).to_lowercase();

        conn.execute(
            "INSERT INTO skill_dependencies (id, skill_id, depends_on_id, dep_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, skill_id, depends_on_id, dt_str, timestamp],
        )
        .map_err(|e| e.to_string())?;

        conn.query_row(
            "SELECT id, skill_id, depends_on_id, dep_type, created_at FROM skill_dependencies WHERE id = ?1",
            [&id],
            map_dep_row,
        )
        .map_err(|e| e.to_string())
    }
}

fn map_dep_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<DependencyDTO> {
    Ok(DependencyDTO {
        id: row.get(0)?,
        skill_id: row.get(1)?,
        depends_on_id: row.get(2)?,
        dep_type: row.get(3)?,
        created_at: row.get(4)?,
    })
}

/// Check if adding skill_id → depends_on_id would create a cycle.
/// Walk from depends_on_id upward; if we can reach skill_id, it's a cycle.
fn would_create_cycle(
    conn: &r2d2::PooledConnection<r2d2_sqlite::SqliteConnectionManager>,
    skill_id: &str,
    depends_on_id: &str,
) -> Result<bool, String> {
    // BFS/DFS from depends_on_id following its dependencies
    // If we reach skill_id, cycle exists
    let mut visited = std::collections::HashSet::new();
    let mut stack = vec![depends_on_id.to_string()];

    while let Some(current) = stack.pop() {
        if current == skill_id {
            return Ok(true);
        }
        if !visited.insert(current.clone()) {
            continue;
        }
        // Find all dependencies of current
        let mut stmt = conn
            .prepare("SELECT depends_on_id FROM skill_dependencies WHERE skill_id = ?1")
            .map_err(|e| e.to_string())?;
        let deps: Vec<String> = stmt
            .query_map([&current], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        stack.extend(deps);
    }

    Ok(false)
}

// ── Remove Dependency ──

#[tauri::command]
pub async fn remove_dependency(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM skill_dependencies WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Impact Analysis ──

#[tauri::command]
pub async fn get_impact_analysis(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<ImpactAnalysisDTO, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let skill_name: String = conn
        .query_row("SELECT name FROM skills WHERE id = ?1", [&skill_id], |r| {
            r.get(0)
        })
        .map_err(|e| format!("Skill not found: {}", e))?;

    // Find all skills that depend directly on skill_id
    let mut stmt = conn
        .prepare("SELECT DISTINCT skill_id FROM skill_dependencies WHERE depends_on_id = ?1")
        .map_err(|e| e.to_string())?;
    let direct: Vec<String> = stmt
        .query_map([&skill_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Find transitive dependents (BFS from direct dependents)
    let mut transitive = Vec::new();
    let mut visited: std::collections::HashSet<String> =
        direct.iter().cloned().collect();
    visited.insert(skill_id.clone());

    let mut queue: Vec<String> = direct.clone();
    while let Some(current) = queue.pop() {
        let mut stmt = conn
            .prepare("SELECT DISTINCT skill_id FROM skill_dependencies WHERE depends_on_id = ?1")
            .map_err(|e| e.to_string())?;
        let children: Vec<String> = stmt
            .query_map([&current], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for child in children {
            if visited.insert(child.clone()) {
                transitive.push(child.clone());
                queue.push(child);
            }
        }
    }

    let total_impacted = (direct.len() + transitive.len()) as i64;

    // Predict breakage: skills that "require" or "import" this skill
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT skill_id FROM skill_dependencies
             WHERE depends_on_id = ?1 AND dep_type IN ('requires','imports','extends')",
        )
        .map_err(|e| e.to_string())?;
    let would_break: Vec<String> = stmt
        .query_map([&skill_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(ImpactAnalysisDTO {
        skill_id,
        skill_name,
        direct_dependents: direct,
        transitive_dependents: transitive,
        would_break_if_removed: would_break,
        total_impacted,
    })
}
