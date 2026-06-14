import type { Agent } from "@/types";
import { cn } from "@/lib/utils";
import { Bot, Folder, ToggleLeft, ToggleRight, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";

interface AgentCardProps {
  agent: Agent;
  onToggle: (enabled: boolean) => Promise<void>;
  onSync: () => Promise<void>;
}

export default function AgentCard({ agent, onToggle, onSync }: AgentCardProps) {
  const [toggling, setToggling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(!agent.enabled);
    setToggling(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              agent.enabled ? "bg-green-500/10" : "bg-muted"
            )}
          >
            <Bot
              className={cn(
                "h-5 w-5",
                agent.enabled ? "text-green-400" : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">{agent.name}</h3>
            <span className="text-xs text-muted-foreground">{agent.agent_type}</span>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          title={agent.enabled ? "Disable" : "Enable"}
        >
          {toggling ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : agent.enabled ? (
            <ToggleRight className="h-5 w-5 text-green-400" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Folder className="h-3.5 w-3.5" />
        <span className="truncate">{agent.skills_path}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            agent.enabled
              ? "bg-green-500/10 text-green-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {agent.enabled ? "Enabled" : "Disabled"}
        </span>
        <button
          onClick={handleSync}
          disabled={syncing || !agent.enabled}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Sync
        </button>
      </div>
    </div>
  );
}
