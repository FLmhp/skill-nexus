use crate::db;
use crate::models::McpServer;
use rusqlite::params;

pub fn get_all_mcp_servers(app: &tauri::AppHandle) -> Result<Vec<McpServer>, String> {
    let conn = db::get_conn(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, transport_type, command, args_json, env_json, url, enabled FROM mcp_servers ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let servers = stmt
        .query_map([], |row| {
            Ok(McpServer {
                id: row.get(0)?,
                name: row.get(1)?,
                transport_type: row.get(2)?,
                command: row.get(3)?,
                args_json: row.get(4)?,
                env_json: row.get(5)?,
                url: row.get(6)?,
                enabled: row.get::<_, i32>(7)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<McpServer>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(servers)
}

pub fn insert_mcp_server(app: &tauri::AppHandle, server: &McpServer) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "INSERT OR REPLACE INTO mcp_servers (id, name, transport_type, command, args_json, env_json, url, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            server.id,
            server.name,
            server.transport_type,
            server.command,
            server.args_json,
            server.env_json,
            server.url,
            server.enabled as i32,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_mcp_server(app: &tauri::AppHandle, server: &McpServer) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "UPDATE mcp_servers SET name = ?1, transport_type = ?2, command = ?3, args_json = ?4, env_json = ?5, url = ?6, enabled = ?7 WHERE id = ?8",
        params![
            server.name,
            server.transport_type,
            server.command,
            server.args_json,
            server.env_json,
            server.url,
            server.enabled as i32,
            server.id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_mcp_server(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute("DELETE FROM mcp_servers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
