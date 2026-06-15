import { invoke } from "@tauri-apps/api/core";
import type { Agent, AgentSyncResult } from "@/types";

export async function getAgents(): Promise<Agent[]> {
  return invoke<Agent[]>("get_agents");
}

export async function updateAgent(agent: Agent): Promise<void> {
  return invoke<void>("update_agent", { agent });
}

export async function syncAgentSkill(
  skillId: string,
  agentId: string,
  enabled: boolean
): Promise<AgentSyncResult> {
  return invoke<AgentSyncResult>("sync_agent_skill", { skillId, agentId, enabled });
}

export async function syncAllAgents(): Promise<AgentSyncResult> {
  return invoke<AgentSyncResult>("sync_all_agents");
}

export async function syncAgent(agentId: string): Promise<AgentSyncResult> {
  return invoke<AgentSyncResult>("sync_agent", { agentId });
}
