use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
    #[serde(rename = "type")]
    pub skill_type: String,
    pub category: Option<String>,
    pub tags: String, // JSON array
    pub version: i32,
    pub author: String,
    pub format: String,
    pub is_active: bool,
    pub is_template: bool,
    pub is_built_in: bool,
    pub content_hash: Option<String>,
    pub metadata: String, // JSON
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub install_path: String,
    pub config_dir: Option<String>,
    pub deploy_method: String,
    pub config_format: String,
    pub version: Option<String>,
    pub icon: Option<String>,
    pub is_active: bool,
    pub last_detected: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub app_version: String,
    pub db_size_bytes: u64,
    pub skills_count: i64,
    pub tools_count: i64,
    pub hub_path: String,
}
