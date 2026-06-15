use tauri::AppHandle;

use crate::db;
use crate::models::{GraphData, ScanImportResult, ScanImportSummary, Skill, SkillRelation};
use crate::services::{parser, scanner};

#[tauri::command]
pub async fn get_skills(app: AppHandle) -> Result<Vec<Skill>, String> {
    db::skills::get_all_skills(&app)
}

#[tauri::command]
pub async fn get_skill(app: AppHandle, id: String) -> Result<Skill, String> {
    db::skills::get_skill_by_id(&app, &id)
}

#[tauri::command]
pub async fn scan_and_import(app: AppHandle) -> Result<ScanImportResult, String> {
    scan_and_import_impl(&app)
}

pub fn scan_and_import_impl(app: &AppHandle) -> Result<ScanImportResult, String> {
    let agents = db::agents::get_all_agents(app)?;
    let mut paths: Vec<String> = Vec::new();
    for agent in &agents {
        if agent.enabled {
            paths.push(agent.skills_path.clone());
        }
    }
    let settings = db::config::get_app_settings(app)?;
    paths.extend(settings.extra_scan_paths);

    let scanned_at = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mut summary = ScanImportSummary {
        scanned_paths: scanner::validate_scan_paths(&paths)?.len() as i32,
        scanned_at,
        ..ScanImportSummary::default()
    };

    if paths.is_empty() {
        return Ok(ScanImportResult {
            skills: db::skills::get_all_skills(app)?,
            summary,
        });
    }

    let scanned = scanner::scan_skills(&paths)?;
    summary.discovered = scanned.len() as i32;
    let mut deduped = Vec::new();
    let mut duplicate_paths = Vec::new();
    let mut seen_keys = std::collections::HashSet::new();
    for entry in scanned {
        let key = skill_key(&entry.name, &entry.path);
        if seen_keys.insert(key) {
            deduped.push(entry);
        } else {
            duplicate_paths.push(entry.path);
            summary.skipped += 1;
        }
    }

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let existing = db::skills::get_all_skills(app)?;

    for duplicate_path in &duplicate_paths {
        if let Some(duplicate) = existing
            .iter()
            .find(|skill| skill.path == *duplicate_path && skill.source_type == "local")
        {
            db::skills::delete_skill(app, &duplicate.id)?;
        }
    }

    for entry in &deduped {
        let entry_key = skill_key(&entry.name, &entry.path);
        let existing_skill = existing.iter().find(|s| {
            s.path == entry.path || (s.source_type == "local" && skill_key(&s.name, &s.path) == entry_key)
        });
        if let Some(conflict) = existing
            .iter()
            .find(|s| s.path == entry.path && Some(s.id.as_str()) != existing_skill.map(|skill| skill.id.as_str()))
        {
            db::skills::delete_skill(app, &conflict.id)?;
        }
        let file_count = count_files(&entry.path);
        let agent = agents
            .iter()
            .find(|a| {
                entry
                    .path
                    .starts_with(&expand_tilde_in_path(&a.skills_path))
            });
        let agent_type = agent.map(|a| a.agent_type.clone());
        let inferred_author = entry
            .author
            .clone()
            .or_else(|| agent.map(|a| a.name.clone()))
            .or_else(|| infer_author_from_path(&entry.path));
        let updated_at = entry.updated_at.clone().unwrap_or_else(|| now.clone());

        let dir_name = std::path::Path::new(&entry.path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unnamed")
            .to_string();

        let skill = if let Some(existing_skill) = existing_skill {
            Skill {
                id: existing_skill.id.clone(),
                name: entry.name.clone(),
                description: entry.description.clone(),
                path: entry.path.clone(),
                source_type: existing_skill.source_type.clone(),
                source_url: entry.source_url.clone().or_else(|| existing_skill.source_url.clone()),
                version: entry.version.clone(),
                author: inferred_author,
                license: entry.license.clone(),
                installed_at: existing_skill.installed_at.clone(),
                updated_at,
                metadata_json: entry.metadata_json.clone(),
                file_count,
                agent_type,
            }
        } else {
            Skill {
                id: sha256_id(&format!("{}:{}", dir_name, entry.path)),
                name: entry.name.clone(),
                description: entry.description.clone(),
                path: entry.path.clone(),
                source_type: "local".to_string(),
                source_url: entry.source_url.clone(),
                version: entry.version.clone(),
                author: inferred_author,
                license: entry.license.clone(),
                installed_at: now.clone(),
                updated_at,
                metadata_json: entry.metadata_json.clone(),
                file_count,
                agent_type,
            }
        };

        db::skills::insert_skill(app, &skill)?;

        if existing_skill.is_some() {
            summary.updated += 1;
        } else {
            summary.imported += 1;
        }
    }

    let all_skills = db::skills::get_all_skills(app)?;
    for entry in &deduped {
        let Some(source_skill) = all_skills.iter().find(|skill| skill.path == entry.path) else {
            continue;
        };
        db::skills::delete_relations_for_source(app, &source_skill.id)?;
        let mut relations = entry.relations.clone();
        relations.extend(infer_content_relations(&entry.content, source_skill, &all_skills));
        let mut relation_keys = std::collections::HashSet::new();
        for relation in &relations {
            if let Some(target_skill) = resolve_relation_target(&all_skills, &relation.target) {
                insert_resolved_relation(app, source_skill, target_skill, &relation.relation_type, &mut relation_keys)?;
            }
        }
    }

    let skills = db::skills::get_all_skills(app)?;
    Ok(ScanImportResult { skills, summary })
}

fn insert_resolved_relation(
    app: &AppHandle,
    source_skill: &Skill,
    target_skill: &Skill,
    relation_type: &str,
    relation_keys: &mut std::collections::HashSet<String>,
) -> Result<(), String> {
    if target_skill.id == source_skill.id {
        return Ok(());
    }
    let key = format!("{}:{}:{}", source_skill.id, target_skill.id, relation_type);
    if !relation_keys.insert(key.clone()) {
        return Ok(());
    }
    let relation = SkillRelation {
        id: sha256_id(&key),
        source_skill_id: source_skill.id.clone(),
        target_skill_id: target_skill.id.clone(),
        relation_type: relation_type.to_string(),
    };
    db::skills::insert_relation(app, &relation)
}

fn infer_content_relations(
    content: &str,
    source_skill: &Skill,
    skills: &[Skill],
) -> Vec<parser::SkillRelationTarget> {
    skills
        .iter()
        .filter(|target| target.id != source_skill.id)
        .filter(|target| content_mentions_skill(content, target))
        .map(|target| parser::SkillRelationTarget {
            relation_type: "references".to_string(),
            target: target.id.clone(),
        })
        .collect()
}

fn content_mentions_skill(content: &str, skill: &Skill) -> bool {
    let content = content.to_lowercase();
    let name = skill.name.to_lowercase();
    let dir_name = std::path::Path::new(&skill.path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mentioned = [name.as_str(), dir_name.as_str()]
        .into_iter()
        .filter(|candidate| candidate.len() >= 4)
        .any(|candidate| contains_skill_token(&content, candidate));
    mentioned
}

fn contains_skill_token(content: &str, candidate: &str) -> bool {
    content.contains(&format!("skills/{candidate}"))
        || content.contains(&format!("skills\\{candidate}"))
        || content.contains(&format!("@{candidate}"))
        || content.contains(&format!("${candidate}"))
        || content.contains(&format!("`{candidate}`"))
        || content.contains(&format!("[{candidate}]"))
        || content.contains(candidate)
}

#[tauri::command]
pub async fn delete_skill(app: AppHandle, id: String) -> Result<(), String> {
    db::skills::delete_skill(&app, &id)
}

#[tauri::command]
pub async fn get_skill_content(app: AppHandle, id: String) -> Result<String, String> {
    let skill = db::skills::get_skill_by_id(&app, &id)?;
    let md_path = std::path::Path::new(&skill.path).join("SKILL.md");
    std::fs::read_to_string(&md_path)
        .map_err(|e| format!("Failed to read SKILL.md at {}: {}", md_path.display(), e))
}

#[tauri::command]
pub async fn save_skill_content(app: AppHandle, id: String, content: String) -> Result<(), String> {
    let skill = db::skills::get_skill_by_id(&app, &id)?;
    let md_path = std::path::Path::new(&skill.path).join("SKILL.md");
    std::fs::write(&md_path, &content).map_err(|e| format!("Failed to write SKILL.md: {}", e))?;

    let (name, description, author, version) = parser::parse_skill_md(&content)?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let updated = Skill {
        name,
        description,
        version,
        author,
        updated_at: now,
        ..skill
    };

    db::skills::update_skill(&app, &updated)
}

#[tauri::command]
pub async fn get_graph(app: AppHandle) -> Result<GraphData, String> {
    db::skills::get_graph_data(&app)
}

fn count_files(dir: &str) -> i32 {
    let path = std::path::Path::new(dir);
    if !path.is_dir() {
        return 0;
    }
    let mut count = 0;
    for entry in walkdir::WalkDir::new(path)
        .into_iter()
        .filter_entry(|e| {
            !e.file_name()
                .to_str()
                .map(|s| s == ".git" || s == "node_modules" || s == "target" || s == "__pycache__")
                .unwrap_or(false)
        })
        .flatten()
    {
        if entry.path().is_file() {
            count += 1;
        }
    }
    count
}

fn resolve_relation_target<'a>(skills: &'a [Skill], target: &str) -> Option<&'a Skill> {
    let target_key = match_key(target);
    skills.iter().find(|skill| {
        skill.id == target
            || match_key(&skill.name) == target_key
            || std::path::Path::new(&skill.path)
                .file_name()
                .and_then(|name| name.to_str())
                .map(match_key)
                .as_deref()
                == Some(target_key.as_str())
    })
}

fn match_key(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect()
}

fn skill_key(name: &str, path: &str) -> String {
    let name_key = match_key(name);
    if !name_key.is_empty() && name_key != "unnamed" {
        return name_key;
    }
    std::path::Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(match_key)
        .unwrap_or_default()
}

fn infer_author_from_path(path: &str) -> Option<String> {
    let normalized = path.replace('\\', "/").to_lowercase();
    if normalized.contains("/.codex/skills") {
        Some("Codex".to_string())
    } else if normalized.contains("/.agents/skills") {
        Some("Agent Skills".to_string())
    } else if normalized.contains("/.claude/skills") {
        Some("Claude Code".to_string())
    } else if normalized.contains("/.gemini/skills") {
        Some("Gemini CLI".to_string())
    } else {
        std::path::Path::new(path)
            .parent()
            .and_then(|parent| parent.file_name())
            .and_then(|name| name.to_str())
            .map(|name| name.replace(['-', '_'], " "))
            .filter(|name| !name.trim().is_empty())
    }
}

fn expand_tilde_in_path(path: &str) -> String {
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

fn sha256_id(input: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())[..16].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("skill_nexus_count_{}_{}", name, std::process::id()))
    }

    #[test]
    fn count_files_is_recursive_and_skips_generated_dirs() {
        let root = temp_dir("recursive");
        let nested = root.join("nested");
        let ignored = root.join("target");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&nested).unwrap();
        fs::create_dir_all(&ignored).unwrap();
        fs::write(root.join("SKILL.md"), "root").unwrap();
        fs::write(nested.join("README.md"), "nested").unwrap();
        fs::write(ignored.join("artifact.txt"), "ignored").unwrap();

        assert_eq!(count_files(root.to_string_lossy().as_ref()), 2);

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn relation_target_matching_uses_names_ids_and_directory_names() {
        let skills = vec![Skill {
            id: "abc123".into(),
            name: "Shared Skill".into(),
            description: String::new(),
            path: "C:\\skills\\shared-skill".into(),
            source_type: "local".into(),
            source_url: None,
            version: None,
            author: None,
            license: None,
            installed_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
            metadata_json: None,
            file_count: 1,
            agent_type: None,
        }];

        assert!(resolve_relation_target(&skills, "abc123").is_some());
        assert!(resolve_relation_target(&skills, "shared skill").is_some());
        assert!(resolve_relation_target(&skills, "shared-skill").is_some());
        assert!(resolve_relation_target(&skills, "missing").is_none());
    }

    #[test]
    fn skill_key_deduplicates_same_named_skills_across_paths() {
        assert_eq!(
            skill_key("agent-reach", "C:\\Users\\solo\\.codex\\skills\\agent-reach"),
            skill_key("Agent Reach", "C:\\Users\\solo\\.agents\\skills\\agent-reach")
        );
    }

    #[test]
    fn content_relation_detection_finds_skill_mentions() {
        let source = Skill {
            id: "source".into(),
            name: "Using Superpowers".into(),
            description: String::new(),
            path: "C:\\skills\\using-superpowers".into(),
            source_type: "local".into(),
            source_url: None,
            version: None,
            author: None,
            license: None,
            installed_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
            metadata_json: None,
            file_count: 1,
            agent_type: None,
        };
        let target = Skill {
            id: "target".into(),
            name: "Agent Skills".into(),
            path: "C:\\skills\\agent-skills".into(),
            ..source.clone()
        };

        let relations = infer_content_relations(
            "Read skills/agent-skills/SKILL.md before continuing.",
            &source,
            &[source.clone(), target],
        );

        assert_eq!(relations.len(), 1);
        assert_eq!(relations[0].target, "target");
    }
}
