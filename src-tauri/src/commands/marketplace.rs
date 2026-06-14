use tauri::{AppHandle, Manager};

use crate::db;
use crate::models::{MarketplaceSkill, Skill};
use crate::services::{marketplace as mp_service, parser};

#[tauri::command]
pub async fn search_marketplace(query: String) -> Result<Vec<MarketplaceSkill>, String> {
    mp_service::search_marketplace(&query).await
}

#[tauri::command]
pub async fn install_from_url(app: AppHandle, url: String) -> Result<Skill, String> {
    let content = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Read response failed: {}", e))?;

    let (name, description, author, version) = parser::parse_skill_md(&content)?;

    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let skills_dir = app_dir.join("installed_skills").join(&name);
    std::fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;

    let md_path = skills_dir.join("SKILL.md");
    std::fs::write(&md_path, &content).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let skill = Skill {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        description,
        path: skills_dir.to_string_lossy().to_string(),
        source_type: "url".to_string(),
        source_url: Some(url),
        version,
        author,
        license: None,
        installed_at: now.clone(),
        updated_at: now,
        metadata_json: None,
        file_count: 1,
        agent_type: None,
    };

    db::skills::insert_skill(&app, &skill)?;
    Ok(skill)
}
