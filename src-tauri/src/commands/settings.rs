use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::db;
use crate::models::AppSettings;
use crate::services::watcher::WatchHandle;

#[derive(Default)]
pub struct AppRuntimeState {
    pub watcher: Mutex<Option<WatchHandle>>,
}

#[tauri::command]
pub async fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    db::config::get_app_settings(&app)
}

#[tauri::command]
pub async fn update_app_settings(
    app: AppHandle,
    state: State<'_, AppRuntimeState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let settings = db::config::update_app_settings(&app, &settings)?;
    sync_watcher_state(&app, state.inner(), &settings)?;
    Ok(settings)
}

#[tauri::command]
pub async fn clear_app_data(
    app: AppHandle,
    state: State<'_, AppRuntimeState>,
) -> Result<(), String> {
    db::config::clear_app_data(&app)?;
    sync_watcher_state(&app, state.inner(), &db::config::get_app_settings(&app)?)?;
    Ok(())
}

pub fn sync_watcher_state(
    app: &AppHandle,
    state: &AppRuntimeState,
    settings: &AppSettings,
) -> Result<(), String> {
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = guard.take() {
        handle.stop();
    }

    if !settings.auto_watch_enabled {
        return Ok(());
    }

    let mut paths = Vec::new();
    for agent in db::agents::get_all_agents(app)? {
        if agent.enabled {
            paths.push(agent.skills_path);
        }
    }
    paths.extend(settings.extra_scan_paths.clone());

    let app_handle = app.clone();
    let handle = crate::services::watcher::start_watcher(paths, move || {
        if let Err(error) = crate::commands::skills::scan_and_import_impl(&app_handle) {
            eprintln!("Skill watcher scan failed: {error}");
        }
    })?;
    *guard = Some(handle);
    Ok(())
}
