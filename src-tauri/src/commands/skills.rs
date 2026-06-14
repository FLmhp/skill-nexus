use tauri::AppHandle;

use crate::db;
use crate::models::{GraphData, Skill};
use crate::services::{parser, scanner};

#[tauri::command]
pub async fn get_skills(app: AppHandle) -> Result<Vec<Skill>, String> {
    db::skills::get_all_skills(&app)
}

#[tauri::command]
pub async fn get_skill(app: AppHandle, id: String) -> Result<Skill, String> {
    db::skills::get_skill_by_id(&app, &id)
}

#[tauri::command]
pub async fn scan_and_import(app: AppHandle) -> Result<Vec<Skill>, String> {
    let agents = db::agents::get_all_agents(&app)?;
    let mut paths: Vec<String> = Vec::new();
    for agent in &agents {
        if agent.enabled {
            paths.push(agent.skills_path.clone());
        }
    }

    if paths.is_empty() {
        return Ok(vec![]);
    }

    let scanned = scanner::scan_skills(&paths)?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let existing = db::skills::get_all_skills(&app)?;

    for (path, name, description, author, version) in &scanned {
        let existing_skill = existing.iter().find(|s| &s.path == path);
        if existing_skill.is_some() {
            continue;
        }

        let file_count = count_files(path);
        let agent_type = agents
            .iter()
            .find(|a| path.starts_with(&expand_tilde_in_path(&a.skills_path)))
            .map(|a| a.agent_type.clone());

        let dir_name = std::path::Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unnamed")
            .to_string();

        let skill_id = sha256_id(&format!("{}:{}", dir_name, path));

        let skill = Skill {
            id: skill_id,
            name: name.clone(),
            description: description.clone(),
            path: path.clone(),
            source_type: "local".to_string(),
            source_url: None,
            version: version.clone(),
            author: author.clone(),
            license: None,
            installed_at: now.clone(),
            updated_at: now.clone(),
            metadata_json: None,
            file_count,
            agent_type,
        };

        db::skills::insert_skill(&app, &skill)?;
    }

    db::skills::get_all_skills(&app)
}

#[tauri::command]
pub async fn delete_skill(app: AppHandle, id: String) -> Result<(), String> {
    db::skills::delete_skill(&app, &id)
}

#[tauri::command]
pub async fn get_skill_content(app: AppHandle, id: String) -> Result<String, String> {
    let skill = db::skills::get_skill_by_id(&app, &id)?;
    let md_path = std::path::Path::new(&skill.path).join("SKILL.md");
    std::fs::read_to_string(&md_path)
        .map_err(|e| format!("Failed to read SKILL.md at {}: {}", md_path.display(), e))
}

#[tauri::command]
pub async fn save_skill_content(
    app: AppHandle,
    id: String,
    content: String,
) -> Result<(), String> {
    let skill = db::skills::get_skill_by_id(&app, &id)?;
    let md_path = std::path::Path::new(&skill.path).join("SKILL.md");
    std::fs::write(&md_path, &content)
        .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;

    let (name, description, author, version) = parser::parse_skill_md(&content)?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let updated = Skill {
        name,
        description,
        version,
        author,
        updated_at: now,
        ..skill
    };

    db::skills::update_skill(&app, &updated)
}

#[tauri::command]
pub async fn get_graph(app: AppHandle) -> Result<GraphData, String> {
    db::skills::get_graph_data(&app)
}

fn count_files(dir: &str) -> i32 {
    let path = std::path::Path::new(dir);
    if !path.is_dir() {
        return 0;
    }
    let mut count = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                count += 1;
            }
        }
    }
    count
}

fn expand_tilde_in_path(path: &str) -> String {
    if !path.starts_with('~') {
        return path.to_string();
    }
    let home = if cfg!(windows) {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };
    if home.is_empty() {
        return path.to_string();
    }
    path.replacen('~', &home, 1)
}

fn sha256_id(input: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())[..16].to_string()
}
