use crate::config::AppConfig;
use crate::db::connection::create_pool;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::fs;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub db: Arc<Pool<SqliteConnectionManager>>,
    pub config: RwLock<AppConfig>,
}

impl AppState {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let config = AppConfig::default();

        // Ensure directories exist
        fs::create_dir_all(&config.hub_path)?;
        fs::create_dir_all(config.hub_path.join("skills"))?;
        fs::create_dir_all(config.hub_path.join("metadata"))?;
        if let Some(parent) = config.db_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let pool = create_pool(&config.db_path)?;

        // Run migrations
        crate::db::migrations::run_migrations(&pool)?;

        log::info!("Skills Nexus initialized. Hub: {:?}", config.hub_path);

        Ok(Self {
            db: Arc::new(pool),
            config: RwLock::new(config),
        })
    }
}
