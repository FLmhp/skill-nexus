use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub hub_path: PathBuf,
    pub db_path: PathBuf,
    pub theme: String,
    pub language: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let home = dirs_next().unwrap_or_else(|| PathBuf::from("."));
        let hub = home.join(".skills-nexus");

        Self {
            hub_path: hub.join("hub"),
            db_path: hub.join("database").join("skills-nexus.db"),
            theme: "system".to_string(),
            language: "en".to_string(),
        }
    }
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}
