import { create } from "zustand";
import type { Agent, AgentSyncResult } from "@/types";
import * as agentsApi from "@/api/agents";
import { toUserError } from "@/lib/apiError";

interface AgentState {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  lastSyncResult: AgentSyncResult | null;
  fetchAgents: () => Promise<void>;
  updateAgent: (agent: Agent) => Promise<void>;
  syncAgent: (agentId: string) => Promise<AgentSyncResult | null>;
  syncAll: () => Promise<AgentSyncResult | null>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  error: null,
  lastSyncResult: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await agentsApi.getAgents();
      set({ agents, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  updateAgent: async (agent: Agent) => {
    set({ loading: true, error: null });
    try {
      await agentsApi.updateAgent(agent);
      const agents = get().agents.map((a) => (a.id === agent.id ? agent : a));
      set({ agents, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  syncAll: async () => {
    set({ loading: true, error: null });
    try {
      const result = await agentsApi.syncAllAgents();
      set({ lastSyncResult: result, loading: false });
      return result;
    } catch (err) {
      set({ error: toUserError(err), loading: false });
      return null;
    }
  },

  syncAgent: async (agentId: string) => {
    set({ loading: true, error: null });
    try {
      const result = await agentsApi.syncAgent(agentId);
      set({ lastSyncResult: result, loading: false });
      return result;
    } catch (err) {
      set({ error: toUserError(err), loading: false });
      return null;
    }
  },
}));
