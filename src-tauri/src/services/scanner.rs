use walkdir::WalkDir;

use crate::services::parser;

type SkillScanEntry = (String, String, String, Option<String>, Option<String>);

pub fn scan_skills(
    paths: &[String],
) -> Result<Vec<SkillScanEntry>, String> {
    let mut results: Vec<SkillScanEntry> = Vec::new();

    for base_path in paths {
        let expanded = expand_tilde(base_path);
        let path = std::path::Path::new(&expanded);

        if !path.exists() {
            continue;
        }

        for entry in WalkDir::new(path)
            .into_iter()
            .filter_entry(|e| {
                !e.file_name()
                    .to_str()
                    .map(|s| s == ".git" || s == "node_modules" || s == "target")
                    .unwrap_or(false)
            })
        {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();

            if entry_path.is_file()
                && entry_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.eq_ignore_ascii_case("skill.md"))
                    .unwrap_or(false)
            {
                let content =
                    std::fs::read_to_string(entry_path).map_err(|e| e.to_string())?;
                let parent = entry_path
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|| entry_path.to_string_lossy().to_string());

                match parser::parse_skill_md(&content) {
                    Ok((name, description, author, version)) => {
                        results.push((parent, name, description, author, version));
                    }
                    Err(_) => {
                        let fallback_name = entry_path
                            .parent()
                            .and_then(|p| p.file_name())
                            .and_then(|n| n.to_str())
                            .unwrap_or("unnamed")
                            .to_string();
                        results.push((parent, fallback_name, String::new(), None, None));
                    }
                }
            }
        }
    }

    Ok(results)
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
