use tauri::{AppHandle, Manager};

use crate::db;
use crate::models::{MarketplaceSearchResponse, Skill};
use crate::services::{marketplace as mp_service, parser};

#[tauri::command]
pub async fn search_marketplace(
    app: AppHandle,
    query: String,
    source: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<MarketplaceSearchResponse, String> {
    let installed_urls = db::skills::get_all_skills(&app)?
        .into_iter()
        .filter_map(|skill| skill.source_url)
        .collect();
    mp_service::search_marketplace(
        &query,
        source.as_deref(),
        page.unwrap_or(1),
        limit.unwrap_or(20),
        &installed_urls,
    )
    .await
}

#[tauri::command]
pub async fn install_from_url(app: AppHandle, url: String) -> Result<Skill, String> {
    let safe_url = validate_marketplace_url(&url)?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get(safe_url.clone())
        .header("User-Agent", "SkillNexus/1.0")
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("Download failed with status {}", response.status()));
    }
    let mut content = response
        .text()
        .await
        .map_err(|e| format!("Read response failed: {}", e))?;
    if looks_like_github_repo(&safe_url) {
        content = fetch_github_skill_md(&client, &safe_url).await?;
    }

    let (name, description, author, version) = parser::parse_skill_md(&content)?;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let installed_root = app_dir.join("installed_skills");
    std::fs::create_dir_all(&installed_root).map_err(|e| e.to_string())?;
    let installed_root = installed_root
        .canonicalize()
        .map_err(|e| format!("Failed to resolve install directory: {}", e))?;
    let skills_dir = installed_root.join(sanitize_dir_name(&name));
    if !skills_dir.starts_with(&installed_root) {
        return Err("Refusing to install outside app data directory".to_string());
    }
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
        source_url: Some(safe_url.to_string()),
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

fn validate_marketplace_url(raw: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(raw).map_err(|_| "Invalid marketplace URL".to_string())?;
    if url.scheme() != "https" {
        return Err("Marketplace installs require an https URL".to_string());
    }
    if url.host_str().is_none() {
        return Err("Marketplace URL must include a host".to_string());
    }
    Ok(url)
}

fn looks_like_github_repo(url: &reqwest::Url) -> bool {
    url.host_str() == Some("github.com")
        && url
            .path_segments()
            .map(|segments| segments.take(3).count() == 2)
            .unwrap_or(false)
}

async fn fetch_github_skill_md(
    client: &reqwest::Client,
    repo_url: &reqwest::Url,
) -> Result<String, String> {
    let mut segments = repo_url
        .path_segments()
        .ok_or_else(|| "Invalid GitHub repository URL".to_string())?;
    let owner = segments
        .next()
        .ok_or_else(|| "GitHub URL must include an owner".to_string())?;
    let repo = segments
        .next()
        .ok_or_else(|| "GitHub URL must include a repository".to_string())?;
    let repo = repo.trim_end_matches(".git");

    for branch in ["main", "master"] {
        let raw_url = format!("https://raw.githubusercontent.com/{owner}/{repo}/{branch}/SKILL.md");
        let response = client
            .get(&raw_url)
            .header("User-Agent", "SkillNexus/1.0")
            .send()
            .await
            .map_err(|e| format!("GitHub raw request failed: {e}"))?;
        if response.status().is_success() {
            return response
                .text()
                .await
                .map_err(|e| format!("Failed to read GitHub SKILL.md: {e}"));
        }
    }

    Err("Could not find SKILL.md at the repository root on main or master".to_string())
}

fn sanitize_dir_name(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = sanitized.trim_matches('-');
    if trimmed.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        trimmed.to_string()
    }
}
