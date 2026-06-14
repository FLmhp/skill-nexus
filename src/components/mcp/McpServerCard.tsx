import { useState } from "react";
import type { McpServer } from "@/types";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Globe,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface McpServerCardProps {
  server: McpServer;
  onToggle: (enabled: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdate: (server: McpServer) => Promise<void>;
}

export default function McpServerCard({
  server,
  onToggle,
  onDelete,
  onUpdate,
}: McpServerCardProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(server.name);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(!server.enabled);
    setToggling(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    await onUpdate({ ...server, name: editName.trim() });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              server.enabled ? "bg-blue-500/10" : "bg-muted"
            )}
          >
            {server.transport_type === "stdio" ? (
              <Terminal
                className={cn(
                  "h-5 w-5",
                  server.enabled ? "text-blue-400" : "text-muted-foreground"
                )}
              />
            ) : (
              <Globe
                className={cn(
                  "h-5 w-5",
                  server.enabled ? "text-blue-400" : "text-muted-foreground"
                )}
              />
            )}
          </div>
          <div>
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded border border-input bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring/20"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="rounded p-0.5 text-green-400 hover:bg-accent"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditName(server.name);
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <h3 className="font-semibold text-sm text-foreground">{server.name}</h3>
            )}
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {server.transport_type.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          title={server.enabled ? "Disable" : "Enable"}
        >
          {toggling ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : server.enabled ? (
            <ToggleRight className="h-5 w-5 text-green-400" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="mt-3">
        {server.transport_type === "stdio" && server.command ? (
          <code className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1 block truncate">
            {server.command}
          </code>
        ) : server.url ? (
          <code className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1 block truncate">
            {server.url}
          </code>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            server.enabled
              ? "bg-green-500/10 text-green-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {server.enabled ? "Active" : "Disabled"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
