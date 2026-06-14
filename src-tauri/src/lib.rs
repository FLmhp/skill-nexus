mod commands;
mod config;
mod db;
mod modules;
mod state;

use state::AppState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(
        AppState::new().expect("Failed to initialize Skills Nexus"),
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(app_state)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            log::info!("Skills Nexus v{} started", env!("CARGO_PKG_VERSION"));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            commands::system::get_app_config,
            commands::system::update_app_config,
            commands::system::get_system_info,
            commands::system::create_backup,
            commands::system::restore_backup,
            commands::system::import_from_legacy,
            // Skills
            commands::skills::list_skills,
            commands::skills::get_skill,
            commands::skills::create_skill,
            commands::skills::update_skill,
            commands::skills::delete_skill,
            commands::skills::duplicate_skill,
            commands::skills::export_skill,
            commands::skills::import_skill,
            commands::skills::get_skill_versions,
            commands::skills::restore_skill_version,
            // Tools
            commands::tools::list_tools,
            commands::tools::detect_tools,
            commands::tools::add_tool,
            commands::tools::update_tool,
            commands::tools::remove_tool,
            // Deployments
            commands::deployments::get_deployment_status,
            commands::deployments::get_deployments,
            commands::deployments::deploy_skill,
            commands::deployments::undeploy_skill,
            commands::deployments::sync_deployment,
            commands::deployments::bulk_deploy,
            commands::deployments::deploy_all_active,
            // Projects
            commands::projects::list_projects,
            // Dependencies
            commands::dependencies::get_full_dependency_graph,
            commands::dependencies::get_skill_dependencies,
            commands::dependencies::add_dependency,
            commands::dependencies::remove_dependency,
            commands::dependencies::get_impact_analysis,
            // Testing
            commands::testing::run_skill_test,
            commands::testing::batch_test_skills,
            commands::testing::get_test_history,
            commands::testing::save_test_case,
            // Analytics
            commands::analytics::get_overview_stats,
            // Marketplace
            commands::marketplace::search_marketplace,
            commands::marketplace::install_from_marketplace,
            commands::marketplace::refresh_marketplace,
            commands::marketplace::get_marketplace_categories,
            // Recommendations
            commands::recommendations::get_ai_recommendation,
            commands::recommendations::ai_generate_skill,
            commands::recommendations::ai_optimize_skill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Skills Nexus");
}
