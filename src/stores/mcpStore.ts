import { create } from "zustand";
import type { McpServer } from "@/types";
import * as mcpApi from "@/api/mcp";

interface McpState {
  servers: McpServer[];
  loading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  addServer: (server: McpServer) => Promise<void>;
  updateServer: (server: McpServer) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  loading: false,
  error: null,

  fetchServers: async () => {
    set({ loading: true, error: null });
    try {
      const servers = await mcpApi.getMcpServers();
      set({ servers, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addServer: async (server: McpServer) => {
    set({ loading: true, error: null });
    try {
      await mcpApi.addMcpServer(server);
      const servers = [...get().servers, server];
      set({ servers, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  updateServer: async (server: McpServer) => {
    set({ loading: true, error: null });
    try {
      await mcpApi.updateMcpServer(server);
      const servers = get().servers.map((s) => (s.id === server.id ? server : s));
      set({ servers, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  deleteServer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await mcpApi.deleteMcpServer(id);
      const servers = get().servers.filter((s) => s.id !== id);
      set({ servers, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
