use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub license: Option<String>,
    pub installed_at: String,
    pub updated_at: String,
    pub metadata_json: Option<String>,
    pub file_count: i32,
    pub agent_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillRelation {
    pub id: String,
    pub source_skill_id: String,
    pub target_skill_id: String,
    pub relation_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub group_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagGroup {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub agent_type: String,
    pub skills_path: String,
    pub config_path: Option<String>,
    pub icon: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSkill {
    pub id: String,
    pub agent_id: String,
    pub skill_id: String,
    pub sync_type: String,
    pub enabled: bool,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub transport_type: String,
    pub command: Option<String>,
    pub args_json: Option<String>,
    pub env_json: Option<String>,
    pub url: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTestResult {
    pub ok: bool,
    pub message: String,
    pub status_code: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentSyncResult {
    pub agent_id: Option<String>,
    pub synced: i32,
    pub failed: i32,
    pub skipped: i32,
    pub failures: Vec<AgentSyncFailure>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSyncFailure {
    pub skill_id: String,
    pub skill_name: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub id: String,
    pub skill_id: String,
    pub skill_name: String,
    pub risk_score: i32,
    pub risk_severity: String,
    pub recommendation: String,
    pub findings_json: String,
    pub components_scanned: i32,
    pub scanned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanFinding {
    pub rule_id: String,
    pub category: String,
    pub severity: String,
    pub pattern: String,
    pub file_path: String,
    pub line_number: Option<u32>,
    pub code_snippet: Option<String>,
    pub confidence: f64,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSkill {
    pub id: String,
    pub source: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub version: String,
    pub downloads: i64,
    pub rating: f64,
    pub source_url: String,
    pub detail_url: Option<String>,
    pub tags: Vec<String>,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSourceError {
    pub source: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSearchResponse {
    pub skills: Vec<MarketplaceSkill>,
    pub source_errors: Vec<MarketplaceSourceError>,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanImportSummary {
    pub scanned_paths: i32,
    pub discovered: i32,
    pub imported: i32,
    pub updated: i32,
    pub skipped: i32,
    pub errors: Vec<String>,
    pub scanned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanImportResult {
    pub skills: Vec<Skill>,
    pub summary: ScanImportSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub group: Option<String>,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub relation_type: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AppSettings {
    pub language: String,
    pub extra_scan_paths: Vec<String>,
    pub auto_watch_enabled: bool,
}
