import { invoke } from "@tauri-apps/api/core";
import type { McpServer } from "@/types";

export async function getMcpServers(): Promise<McpServer[]> {
  return invoke<McpServer[]>("get_mcp_servers");
}

export async function addMcpServer(server: McpServer): Promise<void> {
  return invoke<void>("add_mcp_server", { server });
}

export async function updateMcpServer(server: McpServer): Promise<void> {
  return invoke<void>("update_mcp_server", { server });
}

export async function deleteMcpServer(id: string): Promise<void> {
  return invoke<void>("delete_mcp_server", { id });
}
