#![allow(dead_code)]
use std::path::{Path, PathBuf};
use std::fs;

/// Ensures the hub directory structure exists
/// Creates: hub/skills/, hub/metadata/, database/, backups/, cache/, logs/
pub fn ensure_hub_structure(hub_path: &Path) -> Result<PathBuf, std::io::Error> {
    let dirs = vec![
        hub_path.join("skills"),
        hub_path.join("metadata"),
        hub_path.join("database"),
        hub_path.join("backups"),
        hub_path.join("cache").join("marketplace"),
        hub_path.join("logs"),
    ];

    for dir in &dirs {
        fs::create_dir_all(dir)?;
    }

    Ok(hub_path.to_path_buf())
}

/// Get the hub skills directory
pub fn skills_dir(hub_path: &Path) -> PathBuf {
    hub_path.join("skills")
}

/// Get the hub metadata directory
pub fn metadata_dir(hub_path: &Path) -> PathBuf {
    hub_path.join("metadata")
}

/// Write a skill file to the hub
pub fn write_skill_file(hub_path: &Path, name: &str, content: &str) -> Result<PathBuf, std::io::Error> {
    let skills = skills_dir(hub_path);
    let file_path = skills.join(format!("{}.md", name));
    fs::write(&file_path, content)?;
    Ok(file_path)
}

/// Read a skill file from the hub
pub fn read_skill_file(hub_path: &Path, filename: &str) -> Result<String, std::io::Error> {
    let skills = skills_dir(hub_path);
    fs::read_to_string(skills.join(filename))
}
