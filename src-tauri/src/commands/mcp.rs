use tauri::AppHandle;

use crate::db;
use crate::models::McpServer;

#[tauri::command]
pub async fn get_mcp_servers(app: AppHandle) -> Result<Vec<McpServer>, String> {
    db::mcp::get_all_mcp_servers(&app)
}

#[tauri::command]
pub async fn add_mcp_server(app: AppHandle, server: McpServer) -> Result<(), String> {
    let mut server = server;
    if server.id.is_empty() {
        server.id = uuid::Uuid::new_v4().to_string();
    }
    db::mcp::insert_mcp_server(&app, &server)
}

#[tauri::command]
pub async fn update_mcp_server(app: AppHandle, server: McpServer) -> Result<(), String> {
    db::mcp::update_mcp_server(&app, &server)
}

#[tauri::command]
pub async fn delete_mcp_server(app: AppHandle, id: String) -> Result<(), String> {
    db::mcp::delete_mcp_server(&app, &id)
}
