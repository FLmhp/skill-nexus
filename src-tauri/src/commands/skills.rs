use crate::db::models::Skill;
use crate::state::AppState;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tauri::State;
use uuid::Uuid;

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

fn hash_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

// ── Create ──

#[derive(Debug, Deserialize)]
pub struct CreateSkillInput {
    pub name: String,
    pub description: Option<String>,
    pub content: String,
    #[serde(rename = "type")]
    pub skill_type: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author: Option<String>,
    pub format: Option<String>,
    pub metadata: Option<String>,
}

#[tauri::command]
pub async fn create_skill(
    state: State<'_, AppState>,
    input: CreateSkillInput,
) -> Result<Skill, String> {
    let db = state.db.clone();
    let config = state.config.read().await;
    let conn = db.get().map_err(|e| e.to_string())?;

    let id = new_id();
    let content_hash = hash_content(&input.content);
    let timestamp = now();
    let tags = serde_json::to_string(&input.tags.unwrap_or_default()).unwrap_or_default();
    let skill_type = input.skill_type.unwrap_or_else(|| "custom".to_string());
    let description = input.description.unwrap_or_default();
    let author = input.author.unwrap_or_default();
    let format = input.format.unwrap_or_else(|| "markdown".to_string());
    let metadata = input.metadata.unwrap_or_else(|| "{}".to_string());

    conn.execute(
        "INSERT INTO skills (id, name, description, content, type, category, tags, version,
                              author, format, is_active, is_template, is_built_in,
                              content_hash, metadata, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8,?9,1,0,0,?10,?11,?12,?13)",
        rusqlite::params![
            id, input.name, description, input.content, skill_type,
            input.category, tags, author, format, content_hash, metadata,
            timestamp, timestamp,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Insert initial version
    conn.execute(
        "INSERT INTO skill_versions (id, skill_id, version, content, changelog, created_at)
         VALUES (?1, ?2, 1, ?3, 'Initial version', ?4)",
        rusqlite::params![new_id(), id, input.content, timestamp],
    )
    .map_err(|e| e.to_string())?;

    // Insert into FTS index
    conn.execute(
        "INSERT INTO skills_fts (rowid, name, description, content)
         VALUES ((SELECT rowid FROM skills WHERE id = ?1), ?2, ?3, ?4)",
        rusqlite::params![id, input.name, description, input.content],
    )
    .map_err(|e| e.to_string())?;

    // Write skill file to hub
    let hub_skills = config.hub_path.join("skills");
    std::fs::create_dir_all(&hub_skills).map_err(|e| e.to_string())?;
    let skill_file = hub_skills.join(format!("{}.md", sanitize_filename(&input.name)));
    std::fs::write(&skill_file, &input.content).map_err(|e| e.to_string())?;

    // Return the created skill
    drop(conn);
    get_skill_inner(&db, &id)
}

// ── Read ──

#[tauri::command]
pub async fn get_skill(state: State<'_, AppState>, id: String) -> Result<Skill, String> {
    get_skill_inner(&state.db, &id)
}

fn get_skill_inner(
    db: &std::sync::Arc<r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>>,
    id: &str,
) -> Result<Skill, String> {
    let conn = db.get().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, description, content, type, category, tags, version,
                author, format, is_active, is_template, is_built_in, content_hash,
                metadata, created_at, updated_at
         FROM skills WHERE id = ?1",
        [id],
        map_skill_row,
    )
    .map_err(|e| e.to_string())
}

fn map_skill_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Skill> {
    Ok(Skill {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        content: row.get(3)?,
        skill_type: row.get(4)?,
        category: row.get(5)?,
        tags: row.get(6)?,
        version: row.get(7)?,
        author: row.get(8)?,
        format: row.get(9)?,
        is_active: row.get::<_, i32>(10)? != 0,
        is_template: row.get::<_, i32>(11)? != 0,
        is_built_in: row.get::<_, i32>(12)? != 0,
        content_hash: row.get(13)?,
        metadata: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
    })
}

// ── List with filters ──

#[derive(Debug, Deserialize)]
pub struct SkillFilters {
    pub search: Option<String>,
    pub category: Option<String>,
    pub skill_type: Option<String>,
    pub is_active: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, serde::Serialize)]
pub struct PaginatedSkills {
    pub items: Vec<Skill>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[tauri::command]
pub async fn list_skills(
    state: State<'_, AppState>,
    filters: SkillFilters,
) -> Result<PaginatedSkills, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let search = filters.search.unwrap_or_default();
    let category = filters.category.unwrap_or_default();
    let skill_type = filters.skill_type.unwrap_or_default();
    let is_active = filters.is_active;
    let sort_by = filters.sort_by.unwrap_or_else(|| "updated_at".to_string());
    let sort_dir = filters.sort_dir.unwrap_or_else(|| "DESC".to_string());
    let page = filters.page.unwrap_or(1).max(1);
    let limit = filters.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let use_fts = !search.is_empty();

    let (total, items) = if use_fts {
        let count_sql = "SELECT COUNT(*) FROM skills s
                          INNER JOIN skills_fts fts ON s.rowid = fts.rowid
                          WHERE skills_fts MATCH ?1";
        let total: i64 = conn
            .query_row(count_sql, [&search], |r| r.get(0))
            .unwrap_or(0);

        let sort_col = validate_sort_column(&sort_by);
        let sql = format!(
            "SELECT s.id, s.name, s.description, s.content, s.type, s.category, s.tags, s.version,
                    s.author, s.format, s.is_active, s.is_template, s.is_built_in, s.content_hash,
                    s.metadata, s.created_at, s.updated_at
             FROM skills s
             INNER JOIN skills_fts fts ON s.rowid = fts.rowid
             WHERE skills_fts MATCH ?1
             ORDER BY {} {}
             LIMIT ?2 OFFSET ?3",
            sort_col, validate_sort_dir(&sort_dir)
        );

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let results: Vec<Skill> = stmt
            .query_map(rusqlite::params![search, limit, offset], map_skill_row)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        (total, results)
    } else {
        let mut conditions: Vec<String> = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if !category.is_empty() {
            params.push(Box::new(category.clone()));
            conditions.push(format!("category = ?{}", params.len()));
        }
        if !skill_type.is_empty() {
            params.push(Box::new(skill_type.clone()));
            conditions.push(format!("type = ?{}", params.len()));
        }
        if let Some(active) = is_active {
            params.push(Box::new(active as i32));
            conditions.push(format!("is_active = ?{}", params.len()));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let count_sql = format!("SELECT COUNT(*) FROM skills {}", where_clause);
        let total: i64 = {
            let mut stmt = conn.prepare(&count_sql).map_err(|e| e.to_string())?;
            let param_refs: Vec<&dyn rusqlite::types::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            stmt.query_row(param_refs.as_slice(), |r| r.get(0))
                .unwrap_or(0)
        };

        let sort_col = validate_sort_column(&sort_by);
        let sql = format!(
            "SELECT id, name, description, content, type, category, tags, version,
                    author, format, is_active, is_template, is_built_in, content_hash,
                    metadata, created_at, updated_at
             FROM skills {}
             ORDER BY {} {}
             LIMIT ?{} OFFSET ?{}",
            where_clause,
            sort_col,
            validate_sort_dir(&sort_dir),
            params.len() + 1,
            params.len() + 2,
        );

        let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = params;
        all_params.push(Box::new(limit));
        all_params.push(Box::new(offset));

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            all_params.iter().map(|p| p.as_ref()).collect();
        let results: Vec<Skill> = stmt
            .query_map(param_refs.as_slice(), map_skill_row)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        (total, results)
    };

    Ok(PaginatedSkills {
        total,
        page,
        limit,
        total_pages: ((total as f64) / (limit as f64)).ceil() as i64,
        items,
    })
}

fn validate_sort_column(col: &str) -> &str {
    match col {
        "name" | "type" | "category" | "version" | "created_at" | "updated_at" => col,
        _ => "updated_at",
    }
}

fn validate_sort_dir(dir: &str) -> &str {
    match dir.to_uppercase().as_str() {
        "ASC" => "ASC",
        _ => "DESC",
    }
}

// ── Update ──

#[derive(Debug, Deserialize)]
pub struct UpdateSkillInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author: Option<String>,
    pub format: Option<String>,
    pub metadata: Option<String>,
    pub changelog: Option<String>,
}

#[tauri::command]
pub async fn update_skill(
    state: State<'_, AppState>,
    id: String,
    input: UpdateSkillInput,
) -> Result<Skill, String> {
    let db = state.db.clone();
    let config = state.config.read().await;
    let conn = db.get().map_err(|e| e.to_string())?;

    // Fetch current skill
    let current = conn
        .query_row(
            "SELECT name, description, content, category, tags, author, format, metadata, version
             FROM skills WHERE id = ?1",
            [&id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, i32>(8)?,
                ))
            },
        )
        .map_err(|e| format!("Skill not found: {}", e))?;

    let (
        old_name, old_desc, old_content, old_category,
        old_tags, old_author, old_format, old_metadata, old_version,
    ) = current;

    let new_name = input.name.unwrap_or(old_name.clone());
    let new_desc = input.description.unwrap_or(old_desc.clone());
    let new_content = input.content.unwrap_or(old_content.clone());
    let new_category = input.category.or(old_category);
    let new_tags = input
        .tags
        .map(|t| serde_json::to_string(&t).unwrap_or_default())
        .unwrap_or(old_tags);
    let new_author = input.author.unwrap_or(old_author);
    let new_format = input.format.unwrap_or(old_format);
    let new_metadata = input.metadata.unwrap_or(old_metadata);
    let changelog = input.changelog.unwrap_or_else(|| "Updated".to_string());
    let new_version = old_version + 1;
    let new_hash = hash_content(&new_content);
    let timestamp = now();

    // Update skills table
    conn.execute(
        "UPDATE skills SET name=?1, description=?2, content=?3, category=?4, tags=?5,
                           author=?6, format=?7, metadata=?8, version=?9, content_hash=?10,
                           updated_at=?11
         WHERE id=?12",
        rusqlite::params![
            new_name, new_desc, new_content, new_category, new_tags,
            new_author, new_format, new_metadata, new_version, new_hash,
            timestamp, id,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Archive old version
    conn.execute(
        "INSERT INTO skill_versions (id, skill_id, version, content, changelog, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![new_id(), id, old_version, old_content, changelog, timestamp],
    )
    .map_err(|e| e.to_string())?;

    // Update FTS index
    let rowid: i64 = conn
        .query_row("SELECT rowid FROM skills WHERE id = ?1", [&id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE skills_fts SET name=?1, description=?2, content=?3 WHERE rowid=?4",
        rusqlite::params![new_name, new_desc, new_content, rowid],
    )
    .map_err(|e| e.to_string())?;

    // Update hub file
    let hub_skills = config.hub_path.join("skills");
    let old_file = hub_skills.join(format!("{}.md", sanitize_filename(&old_name)));
    let new_file = hub_skills.join(format!("{}.md", sanitize_filename(&new_name)));
    if old_file != new_file && old_file.exists() {
        let _ = std::fs::remove_file(&old_file);
    }
    std::fs::write(&new_file, &new_content).map_err(|e| e.to_string())?;

    drop(conn);
    get_skill_inner(&db, &id)
}

// ── Delete ──

#[tauri::command]
pub async fn delete_skill(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.clone();
    let config = state.config.read().await;
    let conn = db.get().map_err(|e| e.to_string())?;

    // Get skill name for file cleanup
    let name: String = conn
        .query_row("SELECT name FROM skills WHERE id = ?1", [&id], |r| r.get(0))
        .map_err(|e| format!("Skill not found: {}", e))?;

    // Remove from FTS (cascade doesn't cover virtual tables)
    let rowid: Option<i64> = conn
        .query_row("SELECT rowid FROM skills WHERE id = ?1", [&id], |r| r.get(0))
        .ok();
    if let Some(rid) = rowid {
        conn.execute("DELETE FROM skills_fts WHERE rowid = ?1", [rid])
            .map_err(|e| e.to_string())?;
    }

    // Delete skill (cascades to versions, dependencies, deployments, test_cases, usage_logs)
    conn.execute("DELETE FROM skills WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Remove hub file
    let skill_file = config.hub_path.join("skills").join(format!("{}.md", sanitize_filename(&name)));
    let _ = std::fs::remove_file(&skill_file);

    Ok(())
}

// ── Duplicate ──

#[tauri::command]
pub async fn duplicate_skill(
    state: State<'_, AppState>,
    id: String,
    new_name: Option<String>,
) -> Result<Skill, String> {
    let db = state.db.clone();
    let config = state.config.read().await;
    let conn = db.get().map_err(|e| e.to_string())?;

    let current = get_skill_inner(&db, &id)?;
    let dup_id = new_id();
    let dup_name = new_name.unwrap_or_else(|| format!("{} (Copy)", current.name));
    let timestamp = now();
    let content_hash = hash_content(&current.content);

    conn.execute(
        "INSERT INTO skills (id, name, description, content, type, category, tags, version,
                              author, format, is_active, is_template, is_built_in,
                              content_hash, metadata, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8,?9,1,0,0,?10,?11,?12,?13)",
        rusqlite::params![
            dup_id, dup_name, current.description, current.content, current.skill_type,
            current.category, current.tags, current.author, current.format,
            content_hash, current.metadata, timestamp, timestamp,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Insert initial version
    conn.execute(
        "INSERT INTO skill_versions (id, skill_id, version, content, changelog, created_at)
         VALUES (?1, ?2, 1, ?3, 'Duplicated from ' || ?4, ?5)",
        rusqlite::params![new_id(), dup_id, current.content, current.name, timestamp],
    )
    .map_err(|e| e.to_string())?;

    // FTS
    conn.execute(
        "INSERT INTO skills_fts (rowid, name, description, content)
         VALUES ((SELECT rowid FROM skills WHERE id = ?1), ?2, ?3, ?4)",
        rusqlite::params![dup_id, dup_name, current.description, current.content],
    )
    .map_err(|e| e.to_string())?;

    // Hub file
    let hub_skills = config.hub_path.join("skills");
    std::fs::write(
        hub_skills.join(format!("{}.md", sanitize_filename(&dup_name))),
        &current.content,
    )
    .map_err(|e| e.to_string())?;

    drop(conn);
    get_skill_inner(&db, &dup_id)
}

// ── Export ──

#[derive(Debug, Deserialize)]
pub enum ExportFormat {
    Markdown,
    Json,
    Yaml,
}

#[tauri::command]
pub async fn export_skill(
    state: State<'_, AppState>,
    id: String,
    format: ExportFormat,
) -> Result<String, String> {
    let config = state.config.read().await;
    let skill = get_skill_inner(&state.db, &id)?;

    let export_dir = config.hub_path.join("exports");
    std::fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;

    match format {
        ExportFormat::Markdown => {
            let md = format!(
                "---\nname: {}\ndescription: {}\ntype: {}\ncategory: {}\ntags: {}\nversion: {}\nauthor: {}\n---\n\n{}",
                skill.name,
                skill.description,
                skill.skill_type,
                skill.category.unwrap_or_default(),
                skill.tags,
                skill.version,
                skill.author,
                skill.content,
            );
            let path = export_dir.join(format!("{}.md", sanitize_filename(&skill.name)));
            std::fs::write(&path, &md).map_err(|e| e.to_string())?;
            Ok(path.to_string_lossy().to_string())
        }
        ExportFormat::Json => {
            let json = serde_json::to_string_pretty(&skill).map_err(|e| e.to_string())?;
            let path = export_dir.join(format!("{}.json", sanitize_filename(&skill.name)));
            std::fs::write(&path, &json).map_err(|e| e.to_string())?;
            Ok(path.to_string_lossy().to_string())
        }
        ExportFormat::Yaml => {
            let yaml = serde_yaml::to_string(&skill).map_err(|e| e.to_string())?;
            let path = export_dir.join(format!("{}.yaml", sanitize_filename(&skill.name)));
            std::fs::write(&path, &yaml).map_err(|e| e.to_string())?;
            Ok(path.to_string_lossy().to_string())
        }
    }
}

// ── Import ──

#[tauri::command]
pub async fn import_skill(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<Skill, String> {
    let path = std::path::PathBuf::from(&file_path);
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("md")
        .to_lowercase();

    let (name, description, skill_content, skill_type, category, tags, author) = match ext.as_str() {
        "json" => {
            let v: serde_json::Value =
                serde_json::from_str(&content).map_err(|e| e.to_string())?;
            (
                v["name"].as_str().unwrap_or("Imported Skill").to_string(),
                v["description"].as_str().unwrap_or("").to_string(),
                v["content"].as_str().unwrap_or("").to_string(),
                v["skill_type"].as_str().unwrap_or("custom").to_string(),
                v["category"].as_str().map(|s| s.to_string()),
                v["tags"]
                    .as_array()
                    .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default(),
                v["author"].as_str().unwrap_or("").to_string(),
            )
        }
        "yaml" | "yml" => {
            let v: serde_yaml::Value =
                serde_yaml::from_str(&content).map_err(|e| e.to_string())?;
            (
                v["name"].as_str().unwrap_or("Imported Skill").to_string(),
                v["description"].as_str().unwrap_or("").to_string(),
                v["content"].as_str().unwrap_or("").to_string(),
                v["skill_type"].as_str().unwrap_or("custom").to_string(),
                v["category"].as_str().map(|s| s.to_string()),
                v["tags"]
                    .as_sequence()
                    .map(|s| s.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default(),
                v["author"].as_str().unwrap_or("").to_string(),
            )
        }
        _ => {
            // Markdown with optional YAML frontmatter
            let (frontmatter, body) = parse_frontmatter(&content);
            let name = frontmatter
                .as_ref()
                .and_then(|fm| fm["name"].as_str().map(String::from))
                .unwrap_or_else(|| {
                    path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Imported Skill")
                        .to_string()
                });
            let desc = frontmatter
                .as_ref()
                .and_then(|fm| fm["description"].as_str().map(String::from))
                .unwrap_or_default();
            let stype = frontmatter
                .as_ref()
                .and_then(|fm| fm["skill_type"].as_str().map(String::from))
                .unwrap_or_else(|| "custom".to_string());
            let cat = frontmatter
                .as_ref()
                .and_then(|fm| fm["category"].as_str().map(String::from));
            let tgs: Vec<String> = frontmatter
                .as_ref()
                .and_then(|fm| fm["tags"].as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let aut = frontmatter
                .as_ref()
                .and_then(|fm| fm["author"].as_str().map(String::from))
                .unwrap_or_default();
            (name, desc, body, stype, cat, tgs, aut)
        }
    };

    create_skill(
        state,
        CreateSkillInput {
            name,
            description: Some(description),
            content: skill_content,
            skill_type: Some(skill_type),
            category,
            tags: Some(tags),
            author: Some(author),
            format: Some("markdown".to_string()),
            metadata: None,
        },
    )
    .await
}

fn parse_frontmatter(content: &str) -> (Option<serde_json::Value>, String) {
    let trimmed = content.trim();
    if !trimmed.starts_with("---") {
        return (None, content.to_string());
    }

    let rest = &trimmed[3..];
    if let Some(end) = rest.find("---") {
        let fm_str = &rest[..end].trim();
        let body = rest[end + 3..].trim().to_string();
        let fm: Option<serde_json::Value> = serde_yaml::from_str(fm_str)
            .ok()
            .and_then(|v: serde_yaml::Value| {
                if v.is_mapping() {
                    serde_json::to_value(v).ok()
                } else {
                    None
                }
            });
        (fm, body)
    } else {
        (None, content.to_string())
    }
}

// ── Version History ──

#[derive(Debug, serde::Serialize)]
pub struct SkillVersionDTO {
    pub id: String,
    pub skill_id: String,
    pub version: i32,
    pub content: String,
    pub changelog: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn get_skill_versions(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<Vec<SkillVersionDTO>, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, skill_id, version, content, changelog, created_at
             FROM skill_versions WHERE skill_id = ?1 ORDER BY version DESC",
        )
        .map_err(|e| e.to_string())?;

    let versions = stmt
        .query_map([&skill_id], |row| {
            Ok(SkillVersionDTO {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                version: row.get(2)?,
                content: row.get(3)?,
                changelog: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(versions)
}

#[tauri::command]
pub async fn restore_skill_version(
    state: State<'_, AppState>,
    skill_id: String,
    version: i32,
) -> Result<Skill, String> {
    let db = state.db.clone();
    let conn = db.get().map_err(|e| e.to_string())?;

    // Get the archived version content
    let archived_content: String = conn
        .query_row(
            "SELECT content FROM skill_versions WHERE skill_id = ?1 AND version = ?2",
            rusqlite::params![skill_id, version],
            |r| r.get(0),
        )
        .map_err(|e| format!("Version not found: {}", e))?;

    // Restore by updating the skill (which also archives the current version)
    drop(conn);
    update_skill(
        state,
        skill_id,
        UpdateSkillInput {
            name: None,
            description: None,
            content: Some(archived_content),
            category: None,
            tags: None,
            author: None,
            format: None,
            metadata: None,
            changelog: Some(format!("Restored to version {}", version)),
        },
    )
    .await
}

// ── Utility ──

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim()
        .replace(' ', "-")
}
