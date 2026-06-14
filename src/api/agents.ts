import { invoke } from "@tauri-apps/api/core";
import type { Agent } from "@/types";

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
): Promise<void> {
  return invoke<void>("sync_agent_skill", { skillId, agentId, enabled });
}

export async function syncAllAgents(): Promise<string> {
  return invoke<string>("sync_all_agents");
}
