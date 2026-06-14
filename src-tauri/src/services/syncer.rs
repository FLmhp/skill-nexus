use crate::db;
use std::path::Path;

pub fn sync_skill(
    skill_path: &str,
    agent_path: &str,
    sync_type: &str,
) -> Result<(), String> {
    let skill_dir = Path::new(skill_path);
    let skill_name = skill_dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid skill path".to_string())?;

    let agent_base = expand_tilde(agent_path);
    let target = Path::new(&agent_base).join(skill_name);

    match sync_type {
        "copy" => {
            copy_dir_recursive(skill_dir, &target)?;
        }
        "symlink" => {
            if target.exists() {
                let _ = std::fs::remove_dir_all(&target);
            }
            create_symlink(skill_dir, &target)?;
        }
        _ => {
            return Err(format!("Unknown sync type: {}", sync_type));
        }
    }

    Ok(())
}

pub fn remove_sync(skill_name: &str, agent_path: &str) -> Result<(), String> {
    let agent_base = expand_tilde(agent_path);
    let target = Path::new(&agent_base).join(skill_name);

    if target.exists() {
        if target.is_symlink() || target.is_dir() {
            std::fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
        } else {
            std::fs::remove_file(&target).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn sync_all(app: &tauri::AppHandle) -> Result<(), String> {
    let agents = db::agents::get_all_agents(app)?;
    let skills = db::skills::get_all_skills(app)?;

    for agent in &agents {
        if !agent.enabled {
            continue;
        }
        let agent_skills = db::agents::get_agent_skills(app, &agent.id)?;
        for as_rel in &agent_skills {
            if !as_rel.enabled {
                continue;
            }
            if let Some(skill) = skills.iter().find(|s| s.id == as_rel.skill_id) {
                if let Err(e) = sync_skill(&skill.path, &agent.skills_path, &as_rel.sync_type) {
                    eprintln!(
                        "Failed to sync skill {} to agent {}: {}",
                        skill.name, agent.name, e
                    );
                }
            }
        }
    }

    Ok(())
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
