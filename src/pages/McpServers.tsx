import { useEffect, useState } from "react";
import { useMcpStore } from "@/stores/mcpStore";
import { useI18n } from "@/i18n";
import type { McpServer } from "@/types";
import { Server, Plus, Loader2, AlertCircle, X } from "lucide-react";
import McpServerCard from "@/components/mcp/McpServerCard";

const emptyServer = (): McpServer => ({
  id: crypto.randomUUID(),
  name: "",
  transport_type: "stdio",
  command: "",
  args_json: "",
  env_json: "",
  url: "",
  enabled: true,
});

export default function McpServers() {
  const { servers, loading, error, fetchServers, addServer, updateServer, deleteServer } =
    useMcpStore();
  const testServer = useMcpStore((state) => state.testServer);
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<McpServer>(emptyServer());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleAdd = async () => {
    const validationError = validateMcpForm(form, t("mcp.form.nameRequired"));
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    await addServer(form);
    setShowForm(false);
    setForm(emptyServer());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("mcp.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("mcp.subtitle", {
              count: servers.length,
              plural: servers.length !== 1 ? "s" : "",
            })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={showForm}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("mcp.addServer")}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground">{t("mcp.form.title")}</h3>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title={t("mcp.form.cancel")}
              aria-label={t("mcp.form.cancel")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground">
                  {t("mcp.form.name")} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  placeholder="My MCP Server"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  {t("mcp.form.transport")}
                </label>
                <select
                  value={form.transport_type}
                  onChange={(e) => setForm({ ...form, transport_type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="stdio">STDIO</option>
                  <option value="http">HTTP</option>
                </select>
              </div>
            </div>

            {form.transport_type === "stdio" ? (
              <div>
                <label className="text-xs font-medium text-foreground">{t("mcp.form.command")}</label>
                <input
                  type="text"
                  value={form.command ?? ""}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  placeholder="npx -y my-mcp-server"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-foreground">{t("mcp.form.url")}</label>
                <input
                  type="text"
                  value={form.url ?? ""}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  placeholder="https://mcp.example.com"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground">{t("mcp.form.args")}</label>
                <textarea
                  value={form.args_json ?? ""}
                  onChange={(e) => setForm({ ...form, args_json: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  rows={3}
                  placeholder='["--flag"]'
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">{t("mcp.form.env")}</label>
                <textarea
                  value={form.env_json ?? ""}
                  onChange={(e) => setForm({ ...form, env_json: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  rows={3}
                  placeholder='{"KEY":"value"}'
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-400">{formError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
                className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {t("mcp.form.cancel")}
              </button>
              <button
                onClick={handleAdd}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("mcp.form.add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && servers.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Server className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">{t("mcp.noServers")}</p>
          <p className="text-xs mt-1">{t("mcp.noServersHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {servers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onToggle={async (enabled) => {
                await updateServer({ ...server, enabled });
              }}
              onDelete={async () => {
                await deleteServer(server.id);
              }}
              onUpdate={async (updated) => {
                await updateServer(updated);
              }}
              onTest={testServer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function validateMcpForm(server: McpServer, nameRequiredMessage: string): string | null {
  if (!server.name.trim()) return nameRequiredMessage;

  if (server.transport_type === "stdio" && !server.command?.trim()) {
    return "STDIO command is required";
  }

  if (server.transport_type === "http") {
    try {
      const url = new URL(server.url ?? "");
      if (!["http:", "https:"].includes(url.protocol)) return "HTTP URL must use http or https";
    } catch {
      return "A valid HTTP URL is required";
    }
  }

  for (const [label, value] of [
    ["Args", server.args_json],
    ["Env", server.env_json],
  ] as const) {
    if (value?.trim()) {
      try {
        JSON.parse(value);
      } catch {
        return `${label} JSON is invalid`;
      }
    }
  }

  return null;
}
