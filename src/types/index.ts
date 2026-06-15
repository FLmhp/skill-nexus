export interface Skill {
  id: string;
  name: string;
  description: string;
  path: string;
  source_type: string;
  source_url?: string;
  version?: string;
  author?: string;
  license?: string;
  installed_at: string;
  updated_at: string;
  metadata_json?: string;
  file_count: number;
  agent_type?: string;
}

export interface SkillRelation {
  id: string;
  source_skill_id: string;
  target_skill_id: string;
  relation_type: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  group_id?: string;
}

export interface Agent {
  id: string;
  name: string;
  agent_type: string;
  skills_path: string;
  config_path?: string;
  icon?: string;
  enabled: boolean;
}

export interface AgentSkill {
  id: string;
  agent_id: string;
  skill_id: string;
  sync_type: string;
  enabled: boolean;
  synced_at?: string;
}

export interface AgentSyncFailure {
  skill_id: string;
  skill_name: string;
  error: string;
}

export interface AgentSyncResult {
  agent_id?: string;
  synced: number;
  failed: number;
  skipped: number;
  failures: AgentSyncFailure[];
  message: string;
}

export interface McpServer {
  id: string;
  name: string;
  transport_type: string;
  command?: string;
  args_json?: string;
  env_json?: string;
  url?: string;
  enabled: boolean;
}

export interface McpTestResult {
  ok: boolean;
  message: string;
  status_code?: number;
}

export interface ScanResult {
  id: string;
  skill_id: string;
  skill_name: string;
  risk_score: number;
  risk_severity: string;
  recommendation: string;
  findings_json: string;
  components_scanned: number;
  scanned_at: string;
}

export interface ScanFinding {
  rule_id: string;
  category: string;
  severity: string;
  pattern: string;
  file_path: string;
  line_number?: number;
  code_snippet?: string;
  confidence: number;
  explanation: string;
}

export interface MarketplaceSkill {
  id: string;
  source: "skillsmp" | "mcpmarket" | "skills-sh-directory" | string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  source_url: string;
  detail_url?: string;
  tags: string[];
  installed: boolean;
}

export interface MarketplaceSourceError {
  source: string;
  message: string;
}

export interface MarketplaceSearchResponse {
  skills: MarketplaceSkill[];
  source_errors: MarketplaceSourceError[];
  page: number;
  limit: number;
}

export interface ScanImportSummary {
  scanned_paths: number;
  discovered: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  scanned_at: string;
}

export interface ScanImportResult {
  skills: Skill[];
  summary: ScanImportSummary;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  group?: string;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  label?: string;
}

export interface AppSettings {
  language: "en" | "zh";
  extra_scan_paths: string[];
  auto_watch_enabled: boolean;
}
