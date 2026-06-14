use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn list_projects(_state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    // Stub — full implementation in Phase 5
    Ok(vec![])
}
