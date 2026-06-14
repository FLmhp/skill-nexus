use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ── DTOs ──

#[derive(Debug, Serialize)]
pub struct TestResultDTO {
    pub skill_id: String,
    pub skill_name: String,
    pub input_prompt: String,
    pub actual_output: String,
    pub score: f64,
    pub duration_ms: u64,
    pub model_used: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestCaseDTO {
    pub id: String,
    pub skill_id: String,
    pub name: String,
    pub description: String,
    pub input_prompt: String,
    pub expected_output: Option<String>,
    pub actual_output: Option<String>,
    pub status: String,
    pub score: Option<f64>,
    pub duration_ms: Option<i64>,
    pub model_used: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTestCaseInput {
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub input_prompt: String,
    pub expected_output: Option<String>,
}

// ── Run Skill Test ──

#[tauri::command]
pub async fn run_skill_test(
    state: State<'_, AppState>,
    skill_id: String,
    input_prompt: String,
    model: Option<String>,
) -> Result<TestResultDTO, String> {
    do_test_skill(&state, skill_id, input_prompt, model).await
}

// ── Batch Test ──

#[tauri::command]
pub async fn batch_test_skills(
    state: State<'_, AppState>,
    skill_ids: Vec<String>,
    input_prompt: String,
) -> Result<Vec<TestResultDTO>, String> {
    let mut results = Vec::new();
    for skill_id in &skill_ids {
        match do_test_skill(&state, skill_id.clone(), input_prompt.clone(), None).await {
            Ok(result) => results.push(result),
            Err(e) => log::warn!("Test failed for skill {}: {}", skill_id, e),
        }
    }
    Ok(results)
}

async fn do_test_skill(
    state: &State<'_, AppState>,
    skill_id: String,
    input_prompt: String,
    model: Option<String>,
) -> Result<TestResultDTO, String> {
    let db = state.db.clone();

    let (skill_name, skill_content): (String, String) = {
        let conn = db.get().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT name, content FROM skills WHERE id = ?1",
            [&skill_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Skill not found: {}", e))?
    };

    let model_name = model.unwrap_or_else(|| "claude-haiku".to_string());
    let start = std::time::Instant::now();
    let result = call_llm(&model_name, &skill_content, &input_prompt).await?;
    let duration_ms = start.elapsed().as_millis() as u64;
    let score = score_output(&result, &input_prompt);

    // Save to test_cases
    {
        let conn = db.get().map_err(|e| e.to_string())?;
        let id = Uuid::new_v4().to_string();
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO test_cases (id, skill_id, name, description, input_prompt, actual_output, status, score, duration_ms, model_used, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'passed', ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![id, skill_id, format!("Test: {}", &input_prompt[..input_prompt.len().min(50)]), "", input_prompt, result, score, duration_ms as i64, model_name, timestamp, timestamp],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(TestResultDTO {
        skill_id,
        skill_name,
        input_prompt,
        actual_output: result,
        score,
        duration_ms,
        model_used: model_name,
        status: if score >= 0.5 { "passed".to_string() } else { "failed".to_string() },
    })
}

// ── Test History ──

#[tauri::command]
pub async fn get_test_history(
    state: State<'_, AppState>,
    skill_id: String,
    limit: Option<i32>,
) -> Result<Vec<TestCaseDTO>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(20);

    let mut stmt = conn
        .prepare(
            "SELECT id, skill_id, name, description, input_prompt, expected_output,
                    actual_output, status, score, duration_ms, model_used,
                    created_at, updated_at
             FROM test_cases WHERE skill_id = ?1
             ORDER BY created_at DESC LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let cases = stmt
        .query_map(rusqlite::params![skill_id, limit], map_test_case_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cases)
}

fn map_test_case_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TestCaseDTO> {
    Ok(TestCaseDTO {
        id: row.get(0)?,
        skill_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        input_prompt: row.get(4)?,
        expected_output: row.get(5)?,
        actual_output: row.get(6)?,
        status: row.get(7)?,
        score: row.get(8)?,
        duration_ms: row.get(9)?,
        model_used: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

// ── Save Test Case ──

#[tauri::command]
pub async fn save_test_case(
    state: State<'_, AppState>,
    data: CreateTestCaseInput,
) -> Result<TestCaseDTO, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO test_cases (id, skill_id, name, description, input_prompt, expected_output, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8)",
        rusqlite::params![id, data.skill_id, data.name, data.description.unwrap_or_default(), data.input_prompt, data.expected_output, timestamp, timestamp],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, skill_id, name, description, input_prompt, expected_output, actual_output, status, score, duration_ms, model_used, created_at, updated_at FROM test_cases WHERE id = ?1",
        [&id],
        map_test_case_row,
    )
    .map_err(|e| e.to_string())
}

// ── LLM Provider Abstraction ──

async fn call_llm(model: &str, system_prompt: &str, user_prompt: &str) -> Result<String, String> {
    // Detect provider from model name prefix
    if model.starts_with("claude-") {
        call_anthropic(model, system_prompt, user_prompt).await
    } else if model.starts_with("gpt-") || model.starts_with("o1") || model.starts_with("o3") {
        call_openai(model, system_prompt, user_prompt).await
    } else if model.starts_with("ollama:") {
        let model_name = model.strip_prefix("ollama:").unwrap_or("llama3");
        call_ollama(model_name, system_prompt, user_prompt).await
    } else {
        // Default: use a heuristic mock for offline testing
        Ok(format!(
            "[Test Mode — no API key configured]\n\nModel: {}\nSystem Prompt ({} chars): {}\nUser Input ({} chars): {}\n\nSimulated response: Based on the skill instructions, I would process the input as follows: This appears to be a well-structured prompt. The key elements are clear and actionable. (Mock response for testing purposes.)",
            model,
            system_prompt.len(),
            &system_prompt[..system_prompt.len().min(100)],
            user_prompt.len(),
            &user_prompt[..user_prompt.len().min(100)],
        ))
    }
}

async fn call_anthropic(
    model: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| "ANTHROPIC_API_KEY not set. Please configure it in Settings.")?;

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [
            { "role": "user", "content": user_prompt }
        ]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Anthropic API {}: {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected API response format".to_string())
}

async fn call_openai(
    model: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY not set. Please configure it in Settings.")?;

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 1024,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ]
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI API {}: {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected API response format".to_string())
}

async fn call_ollama(
    model: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": false,
    });

    let resp = client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama request failed (is it running?): {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama API error: {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["response"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected Ollama response format".to_string())
}

// ── Heuristic Scoring ──

fn score_output(output: &str, _input: &str) -> f64 {
    let mut score: f64 = 0.5; // Baseline

    // Longer = generally better (up to a point)
    let len = output.len();
    if len > 50 {
        score += 0.1;
    }
    if len > 200 {
        score += 0.1;
    }
    if len > 500 {
        score += 0.05;
    }

    // Contains code blocks or structured output
    if output.contains("```") {
        score += 0.1;
    }
    if output.contains("- ") || output.contains("1. ") {
        score += 0.05; // Lists indicate structure
    }

    // Not too short (empty is bad)
    if len < 10 {
        score -= 0.3;
    }
    if output.contains("error") || output.contains("failed") {
        score -= 0.15;
    }

    score.clamp(0.0, 1.0)
}
