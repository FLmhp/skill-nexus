use tauri::AppHandle;

use crate::db;
use crate::models::{McpServer, McpTestResult};

#[tauri::command]
pub async fn get_mcp_servers(app: AppHandle) -> Result<Vec<McpServer>, String> {
    db::mcp::get_all_mcp_servers(&app)
}

#[tauri::command]
pub async fn add_mcp_server(app: AppHandle, server: McpServer) -> Result<McpServer, String> {
    let mut server = server;
    if server.id.is_empty() {
        server.id = uuid::Uuid::new_v4().to_string();
    }
    validate_mcp_server(&server)?;
    db::mcp::insert_mcp_server(&app, &server)?;
    Ok(server)
}

#[tauri::command]
pub async fn update_mcp_server(app: AppHandle, server: McpServer) -> Result<McpServer, String> {
    validate_mcp_server(&server)?;
    db::mcp::update_mcp_server(&app, &server)?;
    Ok(server)
}

#[tauri::command]
pub async fn delete_mcp_server(app: AppHandle, id: String) -> Result<(), String> {
    db::mcp::delete_mcp_server(&app, &id)
}

#[tauri::command]
pub async fn test_mcp_server(server: McpServer) -> Result<McpTestResult, String> {
    validate_mcp_server(&server)?;
    match server.transport_type.as_str() {
        "stdio" => {
            let command = server.command.as_deref().unwrap_or_default();
            let executable = command.split_whitespace().next().unwrap_or_default();
            if executable_exists(executable) {
                Ok(McpTestResult {
                    ok: true,
                    message: format!("Command '{executable}' is available"),
                    status_code: None,
                })
            } else {
                Ok(McpTestResult {
                    ok: false,
                    message: format!("Command '{executable}' was not found on PATH"),
                    status_code: None,
                })
            }
        }
        "http" => {
            let url = server.url.as_deref().unwrap_or_default();
            let response = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(8))
                .build()
                .map_err(|e| e.to_string())?
                .get(url)
                .header("User-Agent", "SkillNexus/1.0")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = response.status();
            Ok(McpTestResult {
                ok: status.is_success(),
                message: format!("HTTP endpoint returned {status}"),
                status_code: Some(status.as_u16()),
            })
        }
        _ => Err("Unsupported MCP transport type".to_string()),
    }
}

fn validate_mcp_server(server: &McpServer) -> Result<(), String> {
    if server.name.trim().is_empty() {
        return Err("MCP server name is required".to_string());
    }

    match server.transport_type.as_str() {
        "stdio" => {
            if server.command.as_deref().unwrap_or("").trim().is_empty() {
                return Err("STDIO MCP server requires a command".to_string());
            }
        }
        "http" => {
            let raw = server.url.as_deref().unwrap_or("").trim();
            let url = reqwest::Url::parse(raw)
                .map_err(|_| "HTTP MCP server requires a valid URL".to_string())?;
            if url.scheme() != "http" && url.scheme() != "https" {
                return Err("HTTP MCP server URL must use http or https".to_string());
            }
        }
        _ => return Err("MCP transport must be stdio or http".to_string()),
    }

    validate_json_field(server.args_json.as_deref(), "args_json")?;
    validate_json_field(server.env_json.as_deref(), "env_json")?;
    Ok(())
}

fn validate_json_field(value: Option<&str>, field: &str) -> Result<(), String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(());
    };
    serde_json::from_str::<serde_json::Value>(value)
        .map_err(|e| format!("{field} must be valid JSON: {e}"))?;
    Ok(())
}

fn executable_exists(command: &str) -> bool {
    if command.is_empty() {
        return false;
    }
    let path = std::path::Path::new(command);
    if path.components().count() > 1 {
        return path.exists();
    }
    let lookup_command = if cfg!(windows) { "where" } else { "which" };
    std::process::Command::new(lookup_command)
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_server() -> McpServer {
        McpServer {
            id: "server-1".to_string(),
            name: "Local MCP".to_string(),
            transport_type: "stdio".to_string(),
            command: Some("node server.js".to_string()),
            args_json: None,
            env_json: None,
            url: None,
            enabled: true,
        }
    }

    #[test]
    fn rejects_stdio_server_without_command() {
        let mut server = base_server();
        server.command = Some(" ".to_string());
        assert!(validate_mcp_server(&server).is_err());
    }

    #[test]
    fn rejects_http_server_without_valid_url() {
        let mut server = base_server();
        server.transport_type = "http".to_string();
        server.command = None;
        server.url = Some("not a url".to_string());
        assert!(validate_mcp_server(&server).is_err());
    }

    #[test]
    fn rejects_invalid_json_fields() {
        let mut server = base_server();
        server.args_json = Some("{bad json".to_string());
        assert!(validate_mcp_server(&server).is_err());
    }
}
