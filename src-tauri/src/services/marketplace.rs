use crate::models::{MarketplaceSearchResponse, MarketplaceSkill, MarketplaceSourceError};
use serde::Deserialize;
use std::collections::HashSet;

const USER_AGENT: &str = "SkillNexus/1.0";
const SKILLSMP_SOURCE: &str = "skillsmp";
const MCPMARKET_SOURCE: &str = "mcpmarket";
const SKILLS_SH_SOURCE: &str = "skills-sh-directory";

#[derive(Debug, Deserialize)]
struct SkillsMpResponse {
    success: bool,
    data: Option<SkillsMpData>,
}

#[derive(Debug, Deserialize)]
struct SkillsMpData {
    skills: Vec<SkillsMpSkill>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkillsMpSkill {
    id: String,
    name: String,
    author: String,
    description: String,
    github_url: Option<String>,
    skill_url: Option<String>,
    stars: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct McpMarketResponse {
    servers: Vec<McpMarketServer>,
}

#[derive(Debug, Deserialize)]
struct McpMarketServer {
    #[serde(rename = "_id")]
    id: String,
    name: String,
    by: Option<String>,
    description: Option<String>,
    url: Option<String>,
    categories: Option<Vec<String>>,
    stars: Option<i64>,
}

pub async fn search_marketplace(
    query: &str,
    source: Option<&str>,
    page: u32,
    limit: u32,
    installed_urls: &HashSet<String>,
) -> Result<MarketplaceSearchResponse, String> {
    let query = query.trim();
    let page = page.max(1);
    let limit = limit.clamp(1, 50);
    if query.is_empty() {
        return Ok(MarketplaceSearchResponse {
            skills: Vec::new(),
            source_errors: Vec::new(),
            page,
            limit,
        });
    }

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let mut skills = Vec::new();
    let mut source_errors = Vec::new();
    let selected = source.unwrap_or("all");

    if selected == "all" || selected == SKILLSMP_SOURCE {
        match search_skillsmp(&client, query, page, limit, installed_urls).await {
            Ok(mut items) => skills.append(&mut items),
            Err(message) => source_errors.push(source_error(SKILLSMP_SOURCE, message)),
        }
    }

    if selected == "all" || selected == MCPMARKET_SOURCE {
        match search_mcpmarket(&client, query, page, limit, installed_urls).await {
            Ok(mut items) => skills.append(&mut items),
            Err(message) => source_errors.push(source_error(MCPMARKET_SOURCE, message)),
        }
    }

    if selected == SKILLS_SH_SOURCE {
        source_errors.push(source_error(
            SKILLS_SH_SOURCE,
            "skills.sh does not expose a stable public search API; directory scraping is disabled by default.",
        ));
    }

    Ok(MarketplaceSearchResponse {
        skills,
        source_errors,
        page,
        limit,
    })
}

async fn search_skillsmp(
    client: &reqwest::Client,
    query: &str,
    page: u32,
    limit: u32,
    installed_urls: &HashSet<String>,
) -> Result<Vec<MarketplaceSkill>, String> {
    let mut url = reqwest::Url::parse("https://skillsmp.com/api/v1/skills/search")
        .map_err(|e| e.to_string())?;
    url.query_pairs_mut()
        .append_pair("q", query)
        .append_pair("page", &page.to_string())
        .append_pair("limit", &limit.to_string());

    let response = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("SkillsMP request failed: {e}"))?;
    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("SkillsMP returned {status}"));
    }

    let parsed: SkillsMpResponse =
        serde_json::from_str(&body).map_err(|e| format!("Invalid SkillsMP response: {e}"))?;
    if !parsed.success {
        return Err("SkillsMP reported an unsuccessful response".to_string());
    }

    Ok(map_skillsmp_response(parsed, installed_urls))
}

async fn search_mcpmarket(
    client: &reqwest::Client,
    query: &str,
    page: u32,
    limit: u32,
    installed_urls: &HashSet<String>,
) -> Result<Vec<MarketplaceSkill>, String> {
    let mut url =
        reqwest::Url::parse("https://mcpmarket.cn/api/servers").map_err(|e| e.to_string())?;
    url.query_pairs_mut()
        .append_pair("search", query)
        .append_pair("page", &page.to_string());

    let response = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("MCPMarket request failed: {e}"))?;
    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("MCPMarket returned {status}"));
    }

    let parsed: McpMarketResponse =
        serde_json::from_str(&body).map_err(|e| format!("Invalid MCPMarket response: {e}"))?;
    Ok(map_mcpmarket_response(parsed, limit, installed_urls))
}

fn map_skillsmp_response(
    response: SkillsMpResponse,
    installed_urls: &HashSet<String>,
) -> Vec<MarketplaceSkill> {
    response
        .data
        .map(|data| data.skills)
        .unwrap_or_default()
        .into_iter()
        .map(|skill| {
            let source_url = skill
                .github_url
                .or(skill.skill_url.clone())
                .unwrap_or_default();
            MarketplaceSkill {
                id: skill.id,
                source: SKILLSMP_SOURCE.to_string(),
                name: skill.name,
                description: skill.description,
                author: skill.author,
                version: "latest".to_string(),
                downloads: 0,
                rating: skill.stars.unwrap_or(0) as f64,
                source_url: source_url.clone(),
                detail_url: skill.skill_url,
                tags: vec!["skill".to_string()],
                installed: installed_urls.contains(&source_url),
            }
        })
        .collect()
}

fn map_mcpmarket_response(
    response: McpMarketResponse,
    limit: u32,
    installed_urls: &HashSet<String>,
) -> Vec<MarketplaceSkill> {
    response
        .servers
        .into_iter()
        .take(limit as usize)
        .map(|server| {
            let source_url = server.url.unwrap_or_default();
            MarketplaceSkill {
                id: server.id,
                source: MCPMARKET_SOURCE.to_string(),
                name: server.name,
                description: server.description.unwrap_or_default(),
                author: server.by.unwrap_or_else(|| "unknown".to_string()),
                version: "latest".to_string(),
                downloads: 0,
                rating: server.stars.unwrap_or(0) as f64,
                source_url: source_url.clone(),
                detail_url: Some(source_url.clone()),
                tags: server.categories.unwrap_or_default(),
                installed: installed_urls.contains(&source_url),
            }
        })
        .collect()
}

fn source_error(source: &str, message: impl Into<String>) -> MarketplaceSourceError {
    MarketplaceSourceError {
        source: source.to_string(),
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_skillsmp_response_to_marketplace_skills() {
        let response = SkillsMpResponse {
            success: true,
            data: Some(SkillsMpData {
                skills: vec![SkillsMpSkill {
                    id: "owner-repo-skill-md".to_string(),
                    name: "researcher".to_string(),
                    author: "owner".to_string(),
                    description: "Research skill".to_string(),
                    github_url: Some("https://github.com/owner/repo".to_string()),
                    skill_url: Some("https://skillsmp.com/skills/owner-repo-skill-md".to_string()),
                    stars: Some(12),
                }],
            }),
        };
        let mut installed = HashSet::new();
        installed.insert("https://github.com/owner/repo".to_string());

        let mapped = map_skillsmp_response(response, &installed);

        assert_eq!(mapped.len(), 1);
        assert_eq!(mapped[0].source, "skillsmp");
        assert_eq!(mapped[0].source_url, "https://github.com/owner/repo");
        assert!(mapped[0].installed);
    }

    #[test]
    fn maps_mcpmarket_response_to_mcp_items() {
        let response = McpMarketResponse {
            servers: vec![McpMarketServer {
                id: "server-1".to_string(),
                name: "memory".to_string(),
                by: Some("author".to_string()),
                description: Some("Persistent memory".to_string()),
                url: Some("https://github.com/author/memory".to_string()),
                categories: Some(vec!["数据".to_string()]),
                stars: Some(42),
            }],
        };

        let mapped = map_mcpmarket_response(response, 10, &HashSet::new());

        assert_eq!(mapped.len(), 1);
        assert_eq!(mapped[0].source, "mcpmarket");
        assert_eq!(mapped[0].rating, 42.0);
    }
}
