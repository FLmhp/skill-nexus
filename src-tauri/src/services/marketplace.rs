use crate::models::MarketplaceSkill;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct ApiSkill {
    id: String,
    name: String,
    description: String,
    author: String,
    version: String,
    downloads: Option<i64>,
    rating: Option<f64>,
    source_url: Option<String>,
    tags: Option<Vec<String>>,
}

pub async fn search_marketplace(query: &str) -> Result<Vec<MarketplaceSkill>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://skills.sh/api/skills?search={}", query);
    let response = client
        .get(&url)
        .header("User-Agent", "SkillNexus/1.0")
        .send()
        .await
        .map_err(|e| format!("Marketplace request failed: {}", e))?;

    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("Marketplace API returned {}: {}", status, body));
    }

    let api_skills: Vec<ApiSkill> =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    let skills: Vec<MarketplaceSkill> = api_skills
        .into_iter()
        .map(|s| MarketplaceSkill {
            id: s.id,
            name: s.name,
            description: s.description,
            author: s.author,
            version: s.version,
            downloads: s.downloads.unwrap_or(0),
            rating: s.rating.unwrap_or(0.0),
            source_url: s.source_url.unwrap_or_default(),
            tags: s.tags.unwrap_or_default(),
            installed: false,
        })
        .collect();

    Ok(skills)
}
