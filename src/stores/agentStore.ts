import { create } from "zustand";
import type { Agent } from "@/types";
import * as agentsApi from "@/api/agents";

interface AgentState {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  updateAgent: (agent: Agent) => Promise<void>;
  syncAll: () => Promise<string>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await agentsApi.getAgents();
      set({ agents, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  updateAgent: async (agent: Agent) => {
    set({ loading: true, error: null });
    try {
      await agentsApi.updateAgent(agent);
      const agents = get().agents.map((a) => (a.id === agent.id ? agent : a));
      set({ agents, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  syncAll: async () => {
    set({ loading: true, error: null });
    try {
      const result = await agentsApi.syncAllAgents();
      set({ loading: false });
      return result;
    } catch (err) {
      set({ error: String(err), loading: false });
      return String(err);
    }
  },
}));
