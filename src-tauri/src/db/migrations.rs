use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

pub fn run_migrations(pool: &Pool<SqliteConnectionManager>) -> Result<(), Box<dyn std::error::Error>> {
    let conn = pool.get()?;
    let conn = &conn;

    // Version tracking table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM _migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    for (version, sql) in MIGRATIONS.iter().enumerate() {
        let ver = (version + 1) as i32;
        if ver > current_version {
            conn.execute_batch(sql)?;
            conn.execute("INSERT INTO _migrations (version) VALUES (?1)", [ver])?;
            log::info!("Applied migration v{}", ver);
        }
    }

    Ok(())
}

const MIGRATIONS: &[&str] = &[
    // v1: Core tables
    r#"
    CREATE TABLE IF NOT EXISTS skills (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        content         TEXT NOT NULL,
        type            TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('custom','system','marketplace','template')),
        category        TEXT,
        tags            TEXT NOT NULL DEFAULT '[]',
        version         INTEGER NOT NULL DEFAULT 1,
        author          TEXT NOT NULL DEFAULT '',
        format          TEXT NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown','yaml','text')),
        is_active       INTEGER NOT NULL DEFAULT 1,
        is_template     INTEGER NOT NULL DEFAULT 0,
        is_built_in     INTEGER NOT NULL DEFAULT 0,
        content_hash    TEXT,
        metadata        TEXT NOT NULL DEFAULT '{}',
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skill_versions (
        id              TEXT PRIMARY KEY,
        skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        version         INTEGER NOT NULL,
        content         TEXT NOT NULL,
        changelog       TEXT NOT NULL DEFAULT '',
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(skill_id, version)
    );

    CREATE TABLE IF NOT EXISTS skill_dependencies (
        id              TEXT PRIMARY KEY,
        skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        depends_on_id   TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        dep_type        TEXT NOT NULL DEFAULT 'imports' CHECK (dep_type IN ('imports','extends','requires','conflicts')),
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(skill_id, depends_on_id),
        CHECK (skill_id != depends_on_id)
    );

    CREATE TABLE IF NOT EXISTS tools (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL UNIQUE,
        display_name    TEXT NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        install_path    TEXT NOT NULL,
        config_dir      TEXT,
        deploy_method   TEXT NOT NULL DEFAULT 'symlink' CHECK (deploy_method IN ('symlink','copy','api')),
        config_format   TEXT NOT NULL DEFAULT 'markdown',
        version         TEXT,
        icon            TEXT,
        is_active       INTEGER NOT NULL DEFAULT 1,
        last_detected   TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deployments (
        id              TEXT PRIMARY KEY,
        skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        tool_id         TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        deploy_path     TEXT,
        deploy_method   TEXT NOT NULL DEFAULT 'symlink' CHECK (deploy_method IN ('symlink','copy')),
        status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','syncing','error','outdated')),
        version_deployed INTEGER,
        last_synced_at  TEXT,
        error_message   TEXT,
        deployed_at     TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(skill_id, tool_id)
    );

    CREATE TABLE IF NOT EXISTS projects (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        path            TEXT NOT NULL UNIQUE,
        description     TEXT NOT NULL DEFAULT '',
        tech_stack      TEXT NOT NULL DEFAULT '[]',
        language        TEXT,
        framework       TEXT,
        is_active       INTEGER NOT NULL DEFAULT 1,
        last_scanned_at TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_skills (
        id              TEXT PRIMARY KEY,
        project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        is_deployed     INTEGER NOT NULL DEFAULT 0,
        priority        INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS test_cases (
        id              TEXT PRIMARY KEY,
        skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        input_prompt    TEXT NOT NULL,
        expected_output TEXT,
        actual_output   TEXT,
        status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','passed','failed','error')),
        score           REAL CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
        duration_ms     INTEGER,
        model_used      TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
        id              TEXT PRIMARY KEY,
        skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        tool_id         TEXT REFERENCES tools(id) ON DELETE SET NULL,
        project_id      TEXT REFERENCES projects(id) ON DELETE SET NULL,
        action          TEXT NOT NULL,
        context         TEXT NOT NULL DEFAULT '{}',
        timestamp       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS marketplace_cache (
        id              TEXT PRIMARY KEY,
        source          TEXT NOT NULL,
        skill_name      TEXT NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        author          TEXT NOT NULL DEFAULT '',
        homepage_url    TEXT,
        stars           INTEGER DEFAULT 0,
        downloads       INTEGER DEFAULT 0,
        version         TEXT,
        category        TEXT,
        tags            TEXT NOT NULL DEFAULT '[]',
        content_preview TEXT,
        install_url     TEXT,
        content_hash    TEXT,
        last_refreshed  TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source, skill_name)
    );

    CREATE TABLE IF NOT EXISTS settings (
        key             TEXT PRIMARY KEY,
        value           TEXT NOT NULL,
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    "#,

    // v2: Indexes
    r#"
    CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
    CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
    CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active);
    CREATE INDEX IF NOT EXISTS idx_skill_versions_parent ON skill_versions(skill_id);
    CREATE INDEX IF NOT EXISTS idx_deps_skill ON skill_dependencies(skill_id);
    CREATE INDEX IF NOT EXISTS idx_deps_depends ON skill_dependencies(depends_on_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_tool ON deployments(tool_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
    CREATE INDEX IF NOT EXISTS idx_projskills_project ON project_skills(project_id);
    CREATE INDEX IF NOT EXISTS idx_testcases_skill ON test_cases(skill_id);
    CREATE INDEX IF NOT EXISTS idx_usage_skill ON usage_logs(skill_id);
    CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_logs(action);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_marketplace_name ON marketplace_cache(skill_name);
    CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_cache(category);
    "#,

    // v3: Full-text search
    r#"
    CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
        name,
        description,
        content,
        content='skills',
        content_rowid='rowid'
    );
    "#,

    // v4: Views
    r#"
    CREATE VIEW IF NOT EXISTS v_skill_deployment_status AS
    SELECT
        s.id AS skill_id,
        s.name AS skill_name,
        d.id AS deployment_id,
        t.name AS tool_name,
        d.status AS deploy_status,
        d.deploy_method,
        d.deployed_at,
        d.last_synced_at
    FROM skills s
    LEFT JOIN deployments d ON d.skill_id = s.id
    LEFT JOIN tools t ON t.id = d.tool_id;

    CREATE VIEW IF NOT EXISTS v_dependency_circular_check AS
    SELECT
        a.skill_id,
        a.depends_on_id
    FROM skill_dependencies a
    JOIN skill_dependencies b ON b.skill_id = a.depends_on_id AND b.depends_on_id = a.skill_id;
    "#,
];
