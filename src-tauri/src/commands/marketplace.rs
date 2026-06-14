use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct MarketplaceItemDTO {
    pub id: String,
    pub source: String,
    pub skill_name: String,
    pub description: String,
    pub author: String,
    pub homepage_url: Option<String>,
    pub stars: i64,
    pub downloads: i64,
    pub version: Option<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub content_preview: Option<String>,
    pub install_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MarketplaceFilters {
    pub category: Option<String>,
    pub source: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

// ── Search Marketplace ──

#[tauri::command]
pub async fn search_marketplace(
    state: State<'_, AppState>,
    query: String,
    filters: Option<MarketplaceFilters>,
) -> Result<Vec<MarketplaceItemDTO>, String> {
    let query_clone = query.clone();

    // Query local cache in a sync block (no await)
    let items = {
        let db = state.db.clone();
        let conn = db.get().map_err(|e| e.to_string())?;
        let filters = filters.unwrap_or(MarketplaceFilters {
            category: None, source: None, page: None, limit: None,
        });

        let mut conditions: Vec<String> = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if !query.is_empty() {
            params.push(format!("%{}%", query));
            conditions.push(format!("(skill_name LIKE ?{} OR description LIKE ?{})", params.len(), params.len()));
            params.push(format!("%{}%", query));
        }
        if let Some(cat) = &filters.category {
            params.push(cat.clone());
            conditions.push(format!("category = ?{}", params.len()));
        }
        if let Some(src) = &filters.source {
            params.push(src.clone());
            conditions.push(format!("source = ?{}", params.len()));
        }

        let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
        let limit = filters.limit.unwrap_or(50).min(200);
        let sql = format!(
            "SELECT id, source, skill_name, description, author, homepage_url, stars, downloads, version, category, tags, content_preview, install_url FROM marketplace_cache {} ORDER BY stars DESC LIMIT ?{}",
            where_clause, params.len() + 1,
        );
        params.push(limit.to_string());

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();
        let x = stmt.query_map(param_refs.as_slice(), |row| {
            let tags_str: String = row.get(10).unwrap_or_default();
            Ok(MarketplaceItemDTO {
                id: row.get(0)?, source: row.get(1)?, skill_name: row.get(2)?,
                description: row.get(3)?, author: row.get(4)?, homepage_url: row.get(5)?,
                stars: row.get(6)?, downloads: row.get(7)?, version: row.get(8)?,
                category: row.get(9)?, tags: serde_json::from_str(&tags_str).unwrap_or_default(),
                content_preview: row.get(11)?, install_url: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
        x
    }; // All DB borrows dropped here

    if items.is_empty() && !query_clone.is_empty() {
        return fetch_from_github(&state, &query_clone).await;
    }

    Ok(items)
}

// ── Install from Marketplace ──

#[tauri::command]
pub async fn install_from_marketplace(
    state: State<'_, AppState>,
    marketplace_id: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.clone();
    let config = state.config.read().await;

    // Get the marketplace item
    let item: MarketplaceItemDTO = {
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, source, skill_name, description, author, homepage_url, stars, downloads, version, category, tags, content_preview, install_url
             FROM marketplace_cache WHERE id = ?1",
            [&marketplace_id],
            |row| {
                let tags_str: String = row.get(10).unwrap_or_default();
                let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
                Ok(MarketplaceItemDTO {
                    id: row.get(0)?,
                    source: row.get(1)?,
                    skill_name: row.get(2)?,
                    description: row.get(3)?,
                    author: row.get(4)?,
                    homepage_url: row.get(5)?,
                    stars: row.get(6)?,
                    downloads: row.get(7)?,
                    version: row.get(8)?,
                    category: row.get(9)?,
                    tags,
                    content_preview: row.get(11)?,
                    install_url: row.get(12)?,
                })
            },
        )
        .map_err(|e| format!("Marketplace item not found: {}", e))?
    };

    // Create a skill from the marketplace item
    let skill_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let content = item.content_preview.unwrap_or_else(|| format!("# {}\n\n{}", item.skill_name, item.description));
    let tags_json = serde_json::to_string(&item.tags).unwrap_or_default();

    {
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO skills (id, name, description, content, type, category, tags, version, author, format, is_active, is_template, is_built_in, content_hash, metadata, created_at, updated_at)
             VALUES (?1,?2,?3,?4,'marketplace',?5,?6,1,?7,'markdown',1,0,0,NULL,'{}',?8,?9)",
            rusqlite::params![skill_id, item.skill_name, item.description, content, item.category, tags_json, item.author, timestamp, timestamp],
        )
        .map_err(|e| e.to_string())?;

        // FTS
        conn.execute(
            "INSERT INTO skills_fts (rowid, name, description, content) VALUES ((SELECT rowid FROM skills WHERE id = ?1), ?2, ?3, ?4)",
            rusqlite::params![skill_id, item.skill_name, item.description, content],
        )
        .map_err(|e| e.to_string())?;

        // Initial version
        conn.execute(
            "INSERT INTO skill_versions (id, skill_id, version, content, changelog, created_at) VALUES (?1,?2,1,?3,'Installed from marketplace',?4)",
            rusqlite::params![Uuid::new_v4().to_string(), skill_id, content, timestamp],
        )
        .map_err(|e| e.to_string())?;

        // Update download count
        conn.execute(
            "UPDATE marketplace_cache SET downloads = downloads + 1 WHERE id = ?1",
            [&marketplace_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Write hub file
    let hub_skills = config.hub_path.join("skills");
    std::fs::create_dir_all(&hub_skills).map_err(|e| e.to_string())?;
    let filename = item.skill_name.replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_' && c != ' ', "_").replace(' ', "-");
    std::fs::write(hub_skills.join(format!("{}.md", filename)), &content).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "skill_id": skill_id,
        "name": item.skill_name,
        "source": item.source,
    }))
}

// ── Fetch from GitHub (awesome-claude-skills) ──

async fn fetch_from_github(
    state: &State<'_, AppState>,
    query: &str,
) -> Result<Vec<MarketplaceItemDTO>, String> {
    let db = state.db.clone();

    // Try to fetch from the awesome-claude-skills repo README
    let url = "https://raw.githubusercontent.com/ComposioHQ/awesome-claude-skills/main/README.md";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(url).send().await {
        Ok(resp) => {
            let text = resp.text().await.map_err(|e| e.to_string())?;
            let items = parse_awesome_list(&text, query);
            // Cache results
            if let Ok(conn) = db.get() {
                let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                for item in &items {
                    let id = Uuid::new_v4().to_string();
                    let tags_json = serde_json::to_string(&item.tags).unwrap_or_default();
                    let _ = conn.execute(
                        "INSERT OR IGNORE INTO marketplace_cache (id, source, skill_name, description, author, homepage_url, stars, downloads, version, category, tags, content_preview, install_url, last_refreshed)
                         VALUES (?1,'github',?2,?3,?4,?5,?6,0,'latest',?7,?8,NULL,?9,?10)",
                        rusqlite::params![id, item.skill_name, item.description, item.author, item.homepage_url, item.stars, item.category, tags_json, item.install_url, timestamp],
                    );
                }
            }
            Ok(items)
        }
        Err(_) => {
            // Offline: return empty (cache should have data)
            Ok(vec![])
        }
    }
}

fn parse_awesome_list(readme: &str, _query: &str) -> Vec<MarketplaceItemDTO> {
    let mut items = Vec::new();

    // Parse markdown list items: "- [Name](url) - Description"
    for line in readme.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("- [") && !trimmed.starts_with("* [") {
            continue;
        }

        // Extract name and URL from link
        let name_start = trimmed.find('[').unwrap_or(0) + 1;
        let name_end = trimmed.find(']').unwrap_or(name_start);
        let name = trimmed[name_start..name_end].to_string();

        let url_start = trimmed[name_end..].find('(').map(|p| name_end + p + 1);
        let url_end = trimmed[name_end..].find(')').map(|p| name_end + p);
        let url = match (url_start, url_end) {
            (Some(s), Some(e)) if s < e => Some(trimmed[s..e].to_string()),
            _ => None,
        };

        let desc_start = url_end.unwrap_or(name_end).max(name_end + 1);
        let description = if desc_start < trimmed.len() {
            trimmed[desc_start..].trim().trim_start_matches('-').trim().to_string()
        } else {
            String::new()
        };

        items.push(MarketplaceItemDTO {
            id: Uuid::new_v4().to_string(),
            source: "github".to_string(),
            skill_name: name,
            description,
            author: "Community".to_string(),
            homepage_url: url.clone(),
            stars: 0,
            downloads: 0,
            version: Some("latest".to_string()),
            category: None,
            tags: vec![],
            content_preview: None,
            install_url: url,
        });
    }

    items.truncate(100); // Limit results
    items
}

// ── Refresh Cache ──

#[tauri::command]
pub async fn refresh_marketplace(state: State<'_, AppState>) -> Result<(), String> {
    log::info!("Refreshing marketplace cache...");
    // Trigger a background refresh from all sources
    let _ = fetch_from_github(&state, "").await;
    Ok(())
}

// ── Categories ──

#[tauri::command]
pub async fn get_marketplace_categories(_state: State<'_, AppState>) -> Result<Vec<String>, String> {
    Ok(vec![
        "Code Review".to_string(),
        "Testing".to_string(),
        "Documentation".to_string(),
        "DevOps".to_string(),
        "Frontend".to_string(),
        "Backend".to_string(),
        "Database".to_string(),
        "Security".to_string(),
        "Performance".to_string(),
        "Architecture".to_string(),
        "AI/ML".to_string(),
        "Mobile".to_string(),
        "General".to_string(),
    ])
}
