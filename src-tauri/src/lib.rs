pub mod commands;
pub mod db;
pub mod models;
pub mod services;

use commands::settings::AppRuntimeState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppRuntimeState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            crate::db::init_db(app.handle())?;
            let settings = crate::db::config::get_app_settings(app.handle())?;
            let state = app.state::<AppRuntimeState>();
            crate::commands::settings::sync_watcher_state(app.handle(), state.inner(), &settings)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::skills::get_skills,
            commands::skills::get_skill,
            commands::skills::scan_and_import,
            commands::skills::delete_skill,
            commands::skills::get_skill_content,
            commands::skills::save_skill_content,
            commands::skills::get_graph,
            commands::agents::get_agents,
            commands::agents::update_agent,
            commands::agents::sync_agent_skill,
            commands::agents::sync_agent,
            commands::agents::sync_all_agents,
            commands::mcp::get_mcp_servers,
            commands::mcp::add_mcp_server,
            commands::mcp::update_mcp_server,
            commands::mcp::delete_mcp_server,
            commands::mcp::test_mcp_server,
            commands::marketplace::search_marketplace,
            commands::marketplace::install_from_url,
            commands::scan::scan_skill_security,
            commands::scan::get_scan_results,
            commands::scan::scan_all_skills,
            commands::settings::get_app_settings,
            commands::settings::update_app_settings,
            commands::settings::clear_app_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
