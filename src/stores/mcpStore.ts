import { create } from "zustand";
import type { McpServer, McpTestResult } from "@/types";
import * as mcpApi from "@/api/mcp";
import { toUserError } from "@/lib/apiError";

interface McpState {
  servers: McpServer[];
  loading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  addServer: (server: McpServer) => Promise<void>;
  updateServer: (server: McpServer) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  testServer: (server: McpServer) => Promise<McpTestResult | null>;
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
      set({ error: toUserError(err), loading: false });
    }
  },

  addServer: async (server: McpServer) => {
    set({ loading: true, error: null });
    try {
      const saved = await mcpApi.addMcpServer(server);
      const servers = [...get().servers, saved];
      set({ servers, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  updateServer: async (server: McpServer) => {
    set({ loading: true, error: null });
    try {
      const saved = await mcpApi.updateMcpServer(server);
      const servers = get().servers.map((s) => (s.id === saved.id ? saved : s));
      set({ servers, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  deleteServer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await mcpApi.deleteMcpServer(id);
      const servers = get().servers.filter((s) => s.id !== id);
      set({ servers, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  testServer: async (server: McpServer) => {
    set({ error: null });
    try {
      return await mcpApi.testMcpServer(server);
    } catch (err) {
      set({ error: toUserError(err) });
      return null;
    }
  },
}));
