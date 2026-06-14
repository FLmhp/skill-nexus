use tauri::AppHandle;

use crate::db;
use crate::models::ScanResult;
use crate::services::security;

#[tauri::command]
pub async fn scan_skill_security(app: AppHandle, skill_id: String) -> Result<ScanResult, String> {
    let skill = db::skills::get_skill_by_id(&app, &skill_id)?;
    let mut result = security::scan_skill(&skill.path)?;
    result.skill_id = skill_id;
    result.skill_name = skill.name;

    db::scans::insert_scan_result(&app, &result)?;
    Ok(result)
}

#[tauri::command]
pub async fn get_scan_results(app: AppHandle) -> Result<Vec<ScanResult>, String> {
    db::scans::get_all_scan_results(&app)
}

#[tauri::command]
pub async fn scan_all_skills(app: AppHandle) -> Result<Vec<ScanResult>, String> {
    let skills = db::skills::get_all_skills(&app)?;
    let mut results: Vec<ScanResult> = Vec::new();

    for skill in &skills {
        let mut result = security::scan_skill(&skill.path)?;
        result.skill_id = skill.id.clone();
        result.skill_name = skill.name.clone();
        db::scans::insert_scan_result(&app, &result)?;
        results.push(result);
    }

    Ok(results)
}
