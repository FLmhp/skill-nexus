import { invoke } from "@tauri-apps/api/core"

/**
 * Typed wrapper around Tauri's invoke API.
 * All commands are defined in src-tauri/src/commands/ and registered in lib.rs
 */

// ── System ──
export async function getAppConfig(): Promise<AppConfig> {
  return invoke("get_app_config")
}

export async function updateAppConfig(input: Partial<AppConfig>): Promise<void> {
  return invoke("update_app_config", { input })
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke("get_system_info")
}

// ── Skills ──
export async function listSkills(filters: SkillFilters): Promise<PaginatedSkills> {
  return invoke("list_skills", { filters })
}

export async function getSkill(id: string): Promise<SkillDTO> {
  return invoke("get_skill", { id })
}

export async function createSkill(input: CreateSkillInput): Promise<SkillDTO> {
  return invoke("create_skill", { input })
}

export async function updateSkill(id: string, input: UpdateSkillInput): Promise<SkillDTO> {
  return invoke("update_skill", { id, input })
}

export async function deleteSkill(id: string): Promise<void> {
  return invoke("delete_skill", { id })
}

export async function duplicateSkill(id: string, newName?: string): Promise<SkillDTO> {
  return invoke("duplicate_skill", { id, newName })
}

export async function exportSkill(id: string, format: "Markdown" | "Json" | "Yaml"): Promise<string> {
  return invoke("export_skill", { id, format })
}

export async function importSkill(filePath: string): Promise<SkillDTO> {
  return invoke("import_skill", { filePath })
}

export async function getSkillVersions(skillId: string): Promise<SkillVersionDTO[]> {
  return invoke("get_skill_versions", { skillId })
}

export async function restoreSkillVersion(skillId: string, version: number): Promise<SkillDTO> {
  return invoke("restore_skill_version", { skillId, version })
}

// ── Tools ──
export async function listTools(): Promise<ToolDTO[]> {
  return invoke("list_tools")
}

export async function detectTools(): Promise<ToolDTO[]> {
  return invoke("detect_tools")
}

export async function addTool(input: CreateToolInput): Promise<ToolDTO> {
  return invoke("add_tool", { input })
}

export async function updateTool(id: string, input: UpdateToolInput): Promise<ToolDTO> {
  return invoke("update_tool", { id, input })
}

export async function removeTool(id: string): Promise<void> {
  return invoke("remove_tool", { id })
}

// ── Deployments ──
export async function getDeploymentStatus(): Promise<DeploymentStatusDTO[]> {
  return invoke("get_deployment_status")
}

export async function getDeployments(skillId?: string, toolId?: string): Promise<DeploymentDTO[]> {
  return invoke("get_deployments", { skillId, toolId })
}

export async function deploySkill(skillId: string, toolId: string, method?: string): Promise<DeploymentDTO> {
  return invoke("deploy_skill", { skillId, toolId, method })
}

export async function undeploySkill(skillId: string, toolId: string): Promise<void> {
  return invoke("undeploy_skill", { skillId, toolId })
}

export async function syncDeployment(skillId: string, toolId: string): Promise<DeploymentDTO> {
  return invoke("sync_deployment", { skillId, toolId })
}

export async function bulkDeploy(skillIds: string[], toolId: string, method?: string): Promise<DeploymentDTO[]> {
  return invoke("bulk_deploy", { skillIds, toolId, method })
}

export async function deployAllActive(toolId: string): Promise<DeploymentDTO[]> {
  return invoke("deploy_all_active", { toolId })
}

// ── Dependencies ──
export async function getFullDependencyGraph(): Promise<GraphDTO> {
  return invoke("get_full_dependency_graph")
}

export async function getSkillDependencies(skillId: string): Promise<DependencyDTO[]> {
  return invoke("get_skill_dependencies", { skillId })
}

export async function addDependency(skillId: string, dependsOnId: string, depType: string): Promise<DependencyDTO> {
  return invoke("add_dependency", { skillId, dependsOnId, depType })
}

export async function removeDependency(id: string): Promise<void> {
  return invoke("remove_dependency", { id })
}

export async function getImpactAnalysis(skillId: string): Promise<ImpactAnalysisDTO> {
  return invoke("get_impact_analysis", { skillId })
}

// ── Testing ──
export async function runSkillTest(skillId: string, inputPrompt: string, model?: string): Promise<TestResultDTO> {
  return invoke("run_skill_test", { skillId, inputPrompt, model })
}

export async function batchTestSkills(skillIds: string[], inputPrompt: string): Promise<TestResultDTO[]> {
  return invoke("batch_test_skills", { skillIds, inputPrompt })
}

export async function getTestHistory(skillId: string, limit?: number): Promise<TestCaseDTO[]> {
  return invoke("get_test_history", { skillId, limit })
}

export async function saveTestCase(data: CreateTestCaseInput): Promise<TestCaseDTO> {
  return invoke("save_test_case", { data })
}

// ── Analytics ──
export async function getOverviewStats(): Promise<OverviewStats> {
  return invoke("get_overview_stats")
}

// ── AI Recommendations ──
export async function getAIRecommendation(context?: Record<string, unknown>): Promise<RecommendationDTO[]> {
  return invoke("get_ai_recommendation", { context })
}

export async function aiGenerateSkill(description: string, constraints?: string[]): Promise<string> {
  return invoke("ai_generate_skill", { input: { description, constraints } })
}

export async function aiOptimizeSkill(skillId: string, goal: string): Promise<string> {
  return invoke("ai_optimize_skill", { skillId, goal })
}

export interface RecommendationDTO {
  skill_id: string
  skill_name: string
  match_reason: string
  match_score: number
}

// ── Marketplace ──
export async function searchMarketplace(query: string, filters?: MarketplaceFilters): Promise<MarketplaceItemDTO[]> {
  return invoke("search_marketplace", { query, filters })
}

export async function installFromMarketplace(marketplaceId: string): Promise<unknown> {
  return invoke("install_from_marketplace", { marketplaceId })
}

export async function refreshMarketplace(): Promise<void> {
  return invoke("refresh_marketplace")
}

export async function getMarketplaceCategories(): Promise<string[]> {
  return invoke("get_marketplace_categories")
}

export interface MarketplaceFilters {
  category?: string
  source?: string
  limit?: number
}

export interface MarketplaceItemDTO {
  id: string
  source: string
  skill_name: string
  description: string
  author: string
  homepage_url: string | null
  stars: number
  downloads: number
  version: string | null
  category: string | null
  tags: string[]
  content_preview: string | null
  install_url: string | null
}

// ── Types ──

export interface AppConfig {
  hub_path: string
  theme: string
  language: string
}

export interface SystemInfo {
  os: string
  app_version: string
  db_size_bytes: number
  skills_count: number
  tools_count: number
  hub_path: string
}

export interface SkillFilters {
  search?: string
  category?: string
  skill_type?: string
  is_active?: boolean
  sort_by?: string
  sort_dir?: string
  page?: number
  limit?: number
}

export interface PaginatedSkills {
  items: SkillDTO[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface SkillDTO {
  id: string
  name: string
  description: string
  content: string
  type: string
  category: string | null
  tags: string
  version: number
  author: string
  format: string
  is_active: boolean
  is_template: boolean
  is_built_in: boolean
  content_hash: string | null
  metadata: string
  created_at: string
  updated_at: string
}

export interface CreateSkillInput {
  name: string
  description?: string
  content: string
  type?: string
  category?: string
  tags?: string[]
  author?: string
  format?: string
  metadata?: string
}

export interface UpdateSkillInput {
  name?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  author?: string
  format?: string
  metadata?: string
  changelog?: string
}

export interface SkillVersionDTO {
  id: string
  skill_id: string
  version: number
  content: string
  changelog: string
  created_at: string
}

export interface ToolDTO {
  id: string
  name: string
  display_name: string
  description: string
  install_path: string
  config_dir: string | null
  deploy_method: string
  config_format: string
  version: string | null
  icon: string | null
  is_active: boolean
  last_detected: string | null
  created_at: string
  updated_at: string
}

export interface DeploymentDTO {
  id: string
  skill_id: string
  tool_id: string
  deploy_path: string | null
  deploy_method: string
  status: string
  version_deployed: number | null
  last_synced_at: string | null
  error_message: string | null
  deployed_at: string
}

export interface DeploymentStatusDTO {
  skill_id: string
  skill_name: string
  tool_name: string
  status: string
}

export interface CreateToolInput {
  name: string
  display_name: string
  description?: string
  install_path: string
  config_dir?: string
  deploy_method?: string
  config_format?: string
}

export interface UpdateToolInput {
  display_name?: string
  description?: string
  install_path?: string
  config_dir?: string
  deploy_method?: string
  is_active?: boolean
}

export interface GraphNode {
  id: string
  name: string
  category: string | null
  type: string
  version: number
}

export interface GraphEdge {
  source: string
  target: string
  type: string
}

export interface GraphDTO {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface OverviewStats {
  total_skills: number
  active_skills: number
  total_deployments: number
  connected_tools: number
  total_projects: number
  tests_run: number
}

export interface DependencyDTO {
  id: string
  skill_id: string
  depends_on_id: string
  dep_type: string
  created_at: string
}

export interface ImpactAnalysisDTO {
  skill_id: string
  skill_name: string
  direct_dependents: string[]
  transitive_dependents: string[]
  would_break_if_removed: string[]
  total_impacted: number
}

export interface TestResultDTO {
  skill_id: string
  skill_name: string
  input_prompt: string
  actual_output: string
  score: number
  duration_ms: number
  model_used: string
  status: string
}

export interface TestCaseDTO {
  id: string
  skill_id: string
  name: string
  description: string
  input_prompt: string
  expected_output: string | null
  actual_output: string | null
  status: string
  score: number | null
  duration_ms: number | null
  model_used: string | null
  created_at: string
  updated_at: string
}

export interface CreateTestCaseInput {
  skill_id: string
  name: string
  description?: string
  input_prompt: string
  expected_output?: string
}
