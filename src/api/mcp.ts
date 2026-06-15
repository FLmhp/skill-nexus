import { invoke } from "@tauri-apps/api/core";
import type { McpServer, McpTestResult } from "@/types";

export async function getMcpServers(): Promise<McpServer[]> {
  return invoke<McpServer[]>("get_mcp_servers");
}

export async function addMcpServer(server: McpServer): Promise<McpServer> {
  return invoke<McpServer>("add_mcp_server", { server });
}

export async function updateMcpServer(server: McpServer): Promise<McpServer> {
  return invoke<McpServer>("update_mcp_server", { server });
}

export async function deleteMcpServer(id: string): Promise<void> {
  return invoke<void>("delete_mcp_server", { id });
}

export async function testMcpServer(server: McpServer): Promise<McpTestResult> {
  return invoke<McpTestResult>("test_mcp_server", { server });
}
