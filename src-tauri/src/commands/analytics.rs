use tauri::State;
use crate::state::AppState;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct OverviewStats {
    pub total_skills: i64,
    pub active_skills: i64,
    pub total_deployments: i64,
    pub connected_tools: i64,
    pub total_projects: i64,
    pub tests_run: i64,
}

#[tauri::command]
pub async fn get_overview_stats(state: State<'_, AppState>) -> Result<OverviewStats, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    Ok(OverviewStats {
        total_skills: conn
            .query_row("SELECT COUNT(*) FROM skills", [], |r| r.get(0))
            .unwrap_or(0),
        active_skills: conn
            .query_row("SELECT COUNT(*) FROM skills WHERE is_active = 1", [], |r| r.get(0))
            .unwrap_or(0),
        total_deployments: conn
            .query_row("SELECT COUNT(*) FROM deployments", [], |r| r.get(0))
            .unwrap_or(0),
        connected_tools: conn
            .query_row("SELECT COUNT(*) FROM tools WHERE is_active = 1", [], |r| r.get(0))
            .unwrap_or(0),
        total_projects: conn
            .query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))
            .unwrap_or(0),
        tests_run: conn
            .query_row("SELECT COUNT(*) FROM test_cases", [], |r| r.get(0))
            .unwrap_or(0),
    })
}
