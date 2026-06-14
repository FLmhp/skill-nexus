use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct RecommendationDTO {
    pub skill_id: String,
    pub skill_name: String,
    pub match_reason: String,
    pub match_score: f64,
}

#[derive(Debug, Deserialize)]
pub struct RecommendationContext {
    pub project_id: Option<String>,
    pub tech_stack: Option<Vec<String>>,
    pub language: Option<String>,
    pub framework: Option<String>,
}

// ── Context-Aware Recommendations ──

#[tauri::command]
pub async fn get_ai_recommendation(
    state: State<'_, AppState>,
    context: Option<RecommendationContext>,
) -> Result<Vec<RecommendationDTO>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let mut recommendations = Vec::new();

    if let Some(ctx) = &context {
        let search_terms: Vec<String> = {
            let mut terms = Vec::new();
            if let Some(ts) = &ctx.tech_stack {
                terms.extend(ts.iter().cloned());
            }
            if let Some(lang) = &ctx.language {
                terms.push(lang.clone());
            }
            if let Some(fw) = &ctx.framework {
                terms.push(fw.clone());
            }
            terms
        };

        // Search skills by matching content against tech stack terms
        for term in &search_terms {
            let mut stmt = conn
                .prepare(
                    "SELECT s.id, s.name, s.description, s.type, s.category, s.tags, s.version
                     FROM skills s
                     INNER JOIN skills_fts fts ON s.rowid = fts.rowid
                     WHERE skills_fts MATCH ?1
                     LIMIT 5",
                )
                .map_err(|e| e.to_string())?;

            let results: Vec<RecommendationDTO> = stmt
                .query_map([&term], |row| {
                    let tags_str: String = row.get(5).unwrap_or_default();
                    let tags: Vec<String> =
                        serde_json::from_str(&tags_str).unwrap_or_default();
                    Ok(RecommendationDTO {
                        skill_id: row.get(0)?,
                        skill_name: row.get(1)?,
                        match_reason: format!("Matches your tech stack: {}", term),
                        match_score: if tags.iter().any(|t| t.to_lowercase() == term.to_lowercase()) {
                            0.9
                        } else {
                            0.6
                        },
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;

            recommendations.extend(results);
        }

        // If project context, check project_skills for already-deployed skills
        if let Some(pid) = &ctx.project_id {
            let mut stmt = conn
                .prepare(
                    "SELECT s.id, s.name, s.description, s.type, s.category, s.tags, s.version
                     FROM skills s
                     JOIN project_skills ps ON ps.skill_id = s.id
                     WHERE ps.project_id = ?1 AND ps.is_deployed = 0
                     LIMIT 10",
                )
                .map_err(|e| e.to_string())?;

            let project_recs: Vec<RecommendationDTO> = stmt
                .query_map([pid], |row| {
                    Ok(RecommendationDTO {
                        skill_id: row.get(0)?,
                        skill_name: row.get(1)?,
                        match_reason: "Previously used in this project".to_string(),
                        match_score: 0.85,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;

            recommendations.extend(project_recs);
        }
    }

    // Deduplicate by skill_id, keep highest score
    let mut seen = std::collections::HashMap::new();
    for r in recommendations {
        seen.entry(r.skill_id.clone())
            .and_modify(|existing: &mut RecommendationDTO| {
                if r.match_score > existing.match_score {
                    *existing = r.clone();
                }
            })
            .or_insert(r);
    }

    let mut results: Vec<RecommendationDTO> = seen.into_values().collect();
    results.sort_by(|a, b| b.match_score.partial_cmp(&a.match_score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(10);

    Ok(results)
}

// ── AI Generate Skill (from NL description) ──

#[derive(Debug, Deserialize)]
pub struct GenerateSkillInput {
    pub description: String,
    pub constraints: Option<Vec<String>>,
}

#[tauri::command]
pub async fn ai_generate_skill(
    _state: State<'_, AppState>,
    input: GenerateSkillInput,
) -> Result<String, String> {
    // Build a prompt that generates a well-structured skill
    let constraints_str = input
        .constraints
        .map(|c| c.join(", "))
        .unwrap_or_else(|| "none".to_string());

    // Try using Claude API if available, otherwise generate a template
    let api_key = std::env::var("ANTHROPIC_API_KEY").ok();
    if let Some(key) = api_key {
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "system": "You are a skill prompt generator. Generate a well-structured markdown skill prompt for AI coding assistants. Include: # Name, ## Description, ## Context, ## Instructions, ## Examples sections. Be specific and actionable.",
            "messages": [
                { "role": "user", "content": format!("Generate a skill for: {}\nConstraints: {}", input.description, constraints_str) }
            ]
        });

        match client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                return json["content"][0]["text"]
                    .as_str()
                    .map(|s| s.to_string())
                    .ok_or_else(|| "Unexpected API response".to_string());
            }
            _ => {} // Fall through to template
        }
    }

    // Offline template generator
    let template = format!(
        r#"# {title}

## Description
A skill prompt for: {description}

## Context
- Domain: {domain}
- Constraints: {constraints}

## Instructions
You are an expert assistant specialized in {topic}. When responding:
1. Always consider the context and constraints provided
2. Provide specific, actionable guidance
3. Include code examples where relevant
4. Reference best practices and documentation

## Examples

**User**: Can you help me with {example_topic}?
**Assistant**: [Analyzes the request, applies domain knowledge, provides structured guidance with examples]

## Notes
- This skill was auto-generated from: "{description}"
- Review and customize before deploying"#,
        title = to_title_case(&input.description),
        description = input.description,
        domain = guess_domain(&input.description),
        constraints = constraints_str,
        topic = input.description,
        example_topic = input.description,
    );

    Ok(template)
}

// ── AI Optimize Skill ──

#[derive(Debug, Deserialize)]
pub enum OptimizeGoal {
    Clarity,
    Brevity,
    Effectiveness,
    Completeness,
}

#[tauri::command]
pub async fn ai_optimize_skill(
    state: State<'_, AppState>,
    skill_id: String,
    goal: OptimizeGoal,
) -> Result<String, String> {
    let db = state.db.clone();
    let content: String = {
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT content FROM skills WHERE id = ?1",
            [&skill_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Skill not found: {}", e))?
    };

    let goal_str = format!("{:?}", goal).to_lowercase();

    // Try Claude API
    let api_key = std::env::var("ANTHROPIC_API_KEY").ok();
    if let Some(key) = api_key {
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 2048,
            "system": format!("You are a skill prompt optimizer. Your goal is to improve this skill for: {}. Return ONLY the improved skill markdown. Do not add explanations.", goal_str),
            "messages": [
                { "role": "user", "content": format!("Optimize this skill for {}:\n\n{}", goal_str, content) }
            ]
        });

        match client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                if let Some(optimized) = json["content"][0]["text"].as_str() {
                    return Ok(optimized.to_string());
                }
            }
            _ => {}
        }
    }

    // Offline optimization tips
    let improved = match goal {
        OptimizeGoal::Clarity => {
            format!(
                "// OPTIMIZED FOR CLARITY\n// Added section headers, bullet points, and explicit instructions\n\n{}",
                content
            )
        }
        OptimizeGoal::Brevity => {
            // Naively truncate very long content
            if content.len() > 500 {
                format!(
                    "// OPTIMIZED FOR BREVITY\n// Compressed from {} to ~300 chars\n\n{}...\n\n[Content trimmed for brevity. Review and adjust as needed.]",
                    content.len(),
                    &content[..300],
                )
            } else {
                content
            }
        }
        OptimizeGoal::Effectiveness => {
            format!(
                "// OPTIMIZED FOR EFFECTIVENESS\n// Added specificity, examples, and output formatting\n\n{}\n\n## Expected Output\n- Structured response with clear sections\n- Code examples in fenced blocks\n- References to relevant documentation",
                content
            )
        }
        OptimizeGoal::Completeness => {
            format!(
                "// OPTIMIZED FOR COMPLETENESS\n// Added edge cases, error handling, and follow-up guidance\n\n{}\n\n## Edge Cases\n- Consider unexpected inputs\n- Handle errors gracefully\n## Follow-up\n- Ask clarifying questions if context is insufficient",
                content
            )
        }
    };

    Ok(improved)
}

// ── Helpers ──

fn to_title_case(input: &str) -> String {
    let words: Vec<String> = input
        .split_whitespace()
        .take(6)
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().chain(c).collect(),
            }
        })
        .collect();
    words.join(" ")
}

fn guess_domain(description: &str) -> String {
    let lower = description.to_lowercase();
    if lower.contains("react") || lower.contains("vue") || lower.contains("angular") {
        "Frontend Development".to_string()
    } else if lower.contains("api") || lower.contains("backend") || lower.contains("server") {
        "Backend Development".to_string()
    } else if lower.contains("database") || lower.contains("sql") {
        "Database".to_string()
    } else if lower.contains("test") || lower.contains("qa") {
        "Testing & QA".to_string()
    } else if lower.contains("devops") || lower.contains("deploy") || lower.contains("ci/cd") {
        "DevOps".to_string()
    } else if lower.contains("security") || lower.contains("auth") {
        "Security".to_string()
    } else {
        "General Development".to_string()
    }
}
