use crate::db;
use crate::models::{AgentSyncFailure, AgentSyncResult};
use std::path::Path;

pub fn sync_skill(skill_path: &str, agent_path: &str, sync_type: &str) -> Result<(), String> {
    let skill_dir = Path::new(skill_path)
        .canonicalize()
        .map_err(|e| format!("Invalid skill path: {}", e))?;
    let skill_name = skill_dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid skill path".to_string())?;

    let agent_base = canonical_agent_root(agent_path)?;
    let target = safe_agent_target(&agent_base, skill_name)?;

    match sync_type {
        "copy" => {
            if target.exists() {
                remove_target(&target)?;
            }
            copy_dir_recursive(&skill_dir, &target)?;
        }
        "symlink" => {
            if target.exists() {
                remove_target(&target)?;
            }
            create_symlink(&skill_dir, &target)?;
        }
        _ => {
            return Err(format!("Unknown sync type: {}", sync_type));
        }
    }

    Ok(())
}

pub fn remove_sync(skill_name: &str, agent_path: &str) -> Result<(), String> {
    let agent_base = canonical_agent_root(agent_path)?;
    let target = safe_agent_target(&agent_base, skill_name)?;

    if target.exists() {
        remove_target(&target)?;
    }

    Ok(())
}

pub fn sync_all(app: &tauri::AppHandle) -> Result<AgentSyncResult, String> {
    let agents = db::agents::get_all_agents(app)?;
    let skills = db::skills::get_all_skills(app)?;
    let mut result = AgentSyncResult::default();

    for agent in &agents {
        if !agent.enabled {
            result.skipped += 1;
            continue;
        }
        let agent_skills = db::agents::get_agent_skills(app, &agent.id)?;
        for as_rel in &agent_skills {
            if !as_rel.enabled {
                result.skipped += 1;
                continue;
            }
            if let Some(skill) = skills.iter().find(|s| s.id == as_rel.skill_id) {
                if let Err(e) = sync_skill(&skill.path, &agent.skills_path, &as_rel.sync_type) {
                    result.failed += 1;
                    result.failures.push(AgentSyncFailure {
                        skill_id: skill.id.clone(),
                        skill_name: skill.name.clone(),
                        error: format!("{}: {}", agent.name, e),
                    });
                } else {
                    result.synced += 1;
                }
            } else {
                result.failed += 1;
                result.failures.push(AgentSyncFailure {
                    skill_id: as_rel.skill_id.clone(),
                    skill_name: "unknown".to_string(),
                    error: format!("Skill not found for agent {}", agent.name),
                });
            }
        }
    }

    result.message = format!(
        "Synced {}, failed {}, skipped {}",
        result.synced, result.failed, result.skipped
    );
    Ok(result)
}

pub fn sync_agent(app: &tauri::AppHandle, agent_id: &str) -> Result<AgentSyncResult, String> {
    let agent = db::agents::get_agent_by_id(app, agent_id)?;
    let skills = db::skills::get_all_skills(app)?;
    let agent_skills = db::agents::get_agent_skills(app, agent_id)?;
    let mut result = AgentSyncResult {
        agent_id: Some(agent_id.to_string()),
        ..AgentSyncResult::default()
    };

    if !agent.enabled {
        result.skipped = agent_skills.len() as i32;
        result.message = format!("Agent {} is disabled", agent.name);
        return Ok(result);
    }

    for as_rel in &agent_skills {
        if !as_rel.enabled {
            result.skipped += 1;
            continue;
        }

        if let Some(skill) = skills.iter().find(|s| s.id == as_rel.skill_id) {
            if let Err(error) = sync_skill(&skill.path, &agent.skills_path, &as_rel.sync_type) {
                result.failed += 1;
                result.failures.push(AgentSyncFailure {
                    skill_id: skill.id.clone(),
                    skill_name: skill.name.clone(),
                    error,
                });
            } else {
                result.synced += 1;
            }
        } else {
            result.failed += 1;
            result.failures.push(AgentSyncFailure {
                skill_id: as_rel.skill_id.clone(),
                skill_name: "unknown".to_string(),
                error: format!("Skill not found for agent {}", agent.name),
            });
        }
    }

    result.message = format!(
        "Synced {}, failed {}, skipped {}",
        result.synced, result.failed, result.skipped
    );
    Ok(result)
}

fn expand_tilde(path: &str) -> String {
    if !path.starts_with('~') {
        return path.to_string();
    }
    let home = if cfg!(windows) {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };
    if home.is_empty() {
        return path.to_string();
    }
    path.replacen('~', &home, 1)
}

fn canonical_agent_root(agent_path: &str) -> Result<std::path::PathBuf, String> {
    let agent_base = expand_tilde(agent_path);
    let base = Path::new(&agent_base);
    std::fs::create_dir_all(base).map_err(|e| e.to_string())?;
    base.canonicalize()
        .map_err(|e| format!("Failed to resolve agent path {}: {}", base.display(), e))
}

fn safe_agent_target(base: &Path, skill_name: &str) -> Result<std::path::PathBuf, String> {
    if skill_name.trim().is_empty()
        || skill_name.contains('/')
        || skill_name.contains('\\')
        || skill_name == "."
        || skill_name == ".."
    {
        return Err("Invalid skill name for sync target".to_string());
    }
    let target = base.join(skill_name);
    if !target.starts_with(base) {
        return Err("Refusing to sync outside agent skills directory".to_string());
    }
    Ok(target)
}

fn remove_target(target: &Path) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(target).map_err(|e| e.to_string())?;
    if metadata.file_type().is_symlink() || metadata.is_file() {
        std::fs::remove_file(target).map_err(|e| e.to_string())
    } else {
        std::fs::remove_dir_all(target).map_err(|e| e.to_string())
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.exists() {
        return Err(format!("Source does not exist: {}", src.display()));
    }

    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn create_symlink(src: &Path, dst: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if src.is_dir() {
            std::os::windows::fs::symlink_dir(src, dst).map_err(|e| e.to_string())?;
        } else {
            std::os::windows::fs::symlink_file(src, dst).map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::os::unix::fs::symlink(src, dst).map_err(|e| e.to_string())?;
    }
    Ok(())
}
