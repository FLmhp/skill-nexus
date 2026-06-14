import { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { Bot, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import AgentCard from "@/components/agents/AgentCard";

export default function Agents() {
  const { agents, loading, error, fetchAgents, syncAll, updateAgent } = useAgentStore();

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
          <h2 className="text-2xl font-bold text-foreground">Agents</h2>
          <p className="text-sm text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
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
          Sync All
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && agents.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Bot className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">No agents configured</p>
          <p className="text-xs mt-1">Agents are discovered from your skills directories</p>
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
                await syncAll();
                await fetchAgents();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
