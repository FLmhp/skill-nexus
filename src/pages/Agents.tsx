import { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { useI18n } from "@/i18n";
import { Bot, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import AgentCard from "@/components/agents/AgentCard";

export default function Agents() {
  const {
    agents,
    loading,
    error,
    lastSyncResult,
    fetchAgents,
    syncAll,
    syncAgent,
    updateAgent,
  } = useAgentStore();
  const { t } = useI18n();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSyncAll = async () => {
    await syncAll();
    await fetchAgents();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("agents.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("agents.subtitle", {
              count: agents.length,
              plural: agents.length !== 1 ? "s" : "",
            })}
          </p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("agents.syncAll")}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {lastSyncResult && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          <p>
            {t("agents.syncSummary", {
              synced: lastSyncResult.synced,
              failed: lastSyncResult.failed,
              skipped: lastSyncResult.skipped,
            })}
          </p>
          {lastSyncResult.failures.length > 0 && (
            <ul className="mt-2 space-y-1">
              {lastSyncResult.failures.slice(0, 5).map((failure) => (
                <li key={`${failure.skill_id}-${failure.error}`} className="text-red-400">
                  {failure.skill_name}: {failure.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading && agents.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Bot className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">{t("agents.noAgents")}</p>
          <p className="text-xs mt-1">{t("agents.noAgentsHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggle={async (enabled) => {
                await updateAgent({ ...agent, enabled });
              }}
              onSync={async () => {
                await syncAgent(agent.id);
                await fetchAgents();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
