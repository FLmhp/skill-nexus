use walkdir::WalkDir;

use crate::services::parser::{self, SkillRelationTarget};

pub struct SkillScanEntry {
    pub path: String,
    pub name: String,
    pub description: String,
    pub author: Option<String>,
    pub version: Option<String>,
    pub license: Option<String>,
    pub metadata_json: Option<String>,
    pub relations: Vec<SkillRelationTarget>,
}

pub fn scan_skills(paths: &[String]) -> Result<Vec<SkillScanEntry>, String> {
    let mut results: Vec<SkillScanEntry> = Vec::new();
    let paths = validate_scan_paths(paths)?;

    for path in paths {
        for entry in WalkDir::new(path).into_iter().filter_entry(|e| {
            !e.file_name()
                .to_str()
                .map(|s| s == ".git" || s == "node_modules" || s == "target" || s == "__pycache__")
                .unwrap_or(false)
        }) {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();

            if entry_path.is_file()
                && entry_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.eq_ignore_ascii_case("skill.md"))
                    .unwrap_or(false)
            {
                let content = std::fs::read_to_string(entry_path).map_err(|e| e.to_string())?;
                let parent = entry_path
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|| entry_path.to_string_lossy().to_string());

                match parser::parse_skill_manifest(&content) {
                    Ok(manifest) => {
                        results.push(SkillScanEntry {
                            path: parent,
                            name: manifest.name,
                            description: manifest.description,
                            author: manifest.author,
                            version: manifest.version,
                            license: manifest.license,
                            metadata_json: manifest.metadata_json,
                            relations: manifest.relations,
                        });
                    }
                    Err(_) => {
                        let fallback_name = entry_path
                            .parent()
                            .and_then(|p| p.file_name())
                            .and_then(|n| n.to_str())
                            .unwrap_or("unnamed")
                            .to_string();
                        results.push(SkillScanEntry {
                            path: parent,
                            name: fallback_name,
                            description: String::new(),
                            author: None,
                            version: None,
                            license: None,
                            metadata_json: None,
                            relations: Vec::new(),
                        });
                    }
                }
            }
        }
    }

    Ok(results)
}

pub fn validate_scan_paths(paths: &[String]) -> Result<Vec<std::path::PathBuf>, String> {
    let mut results = Vec::new();

    for raw_path in paths {
        let expanded = expand_tilde(raw_path);
        let path = std::path::Path::new(&expanded);

        if !path.exists() {
            continue;
        }

        let canonical = path
            .canonicalize()
            .map_err(|e| format!("Failed to resolve scan path {}: {}", path.display(), e))?;

        if !canonical.is_dir() {
            continue;
        }

        if is_sensitive_root(&canonical) {
            return Err(format!(
                "Refusing to scan sensitive system path: {}",
                canonical.display()
            ));
        }

        if !results.iter().any(|existing| existing == &canonical) {
            results.push(canonical);
        }
    }

    Ok(results)
}

fn is_sensitive_root(path: &std::path::Path) -> bool {
    let normalized = path.to_string_lossy().replace('\\', "/").to_lowercase();

    if cfg!(windows) {
        normalized.ends_with(":/")
            || normalized.contains("/windows")
            || normalized.contains("/program files")
            || normalized.contains("/program files (x86)")
            || normalized.contains("/system32")
    } else {
        matches!(
            normalized.as_str(),
            "/" | "/etc" | "/proc" | "/sys" | "/dev" | "/bin" | "/sbin" | "/usr" | "/var"
        )
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "skill_nexus_scanner_{}_{}",
            name,
            std::process::id()
        ))
    }

    #[test]
    fn validate_scan_paths_canonicalizes_and_deduplicates() {
        let root = temp_dir("dedupe");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        let root_str = root.to_string_lossy().to_string();
        let validated =
            validate_scan_paths(&[root_str.clone(), root_str, "Z:\\missing\\path".into()]).unwrap();

        assert_eq!(validated.len(), 1);
        assert!(validated[0].is_dir());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn scan_skills_ignores_dependency_directories() {
        let root = temp_dir("ignored_dirs");
        let skill_dir = root.join("real-skill");
        let ignored_dir = root.join("node_modules").join("ignored-skill");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&skill_dir).unwrap();
        fs::create_dir_all(&ignored_dir).unwrap();
        fs::write(
            skill_dir.join("SKILL.md"),
            "---\nname: Real Skill\ndescription: Imported\n---\n",
        )
        .unwrap();
        fs::write(
            ignored_dir.join("SKILL.md"),
            "---\nname: Ignored Skill\ndescription: Skipped\n---\n",
        )
        .unwrap();

        let scanned = scan_skills(&[root.to_string_lossy().to_string()]).unwrap();

        assert_eq!(scanned.len(), 1);
        assert_eq!(scanned[0].name, "Real Skill");

        let _ = fs::remove_dir_all(&root);
    }
}
