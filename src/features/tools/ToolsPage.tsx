import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Wrench, Search, Plus, Loader2, Trash2, Settings,
  Circle, RefreshCw, ExternalLink, FolderKanban
} from "lucide-react"
import {
  useToolsList, useDetectTools, useAddTool,
  useUpdateTool, useRemoveTool, useBulkDeploy
} from "../../hooks/useDeployments"
import { cn } from "../../lib/cn"
import type { ToolDTO, CreateToolInput } from "../../services/ipc"

export function ToolsPage() {
  const { t } = useTranslation()
  const { data: tools, isLoading } = useToolsList()
  const detectMutation = useDetectTools()
  const addMutation = useAddTool()
  const updateMutation = useUpdateTool()
  const removeMutation = useRemoveTool()
  const deployAllMutation = useBulkDeploy()

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<CreateToolInput>({
    name: "", display_name: "", install_path: "",
    config_dir: "", deploy_method: "symlink"
  })

  const handleScan = () => detectMutation.mutate()
  const handleAdd = () => {
    if (!addForm.name || !addForm.display_name || !addForm.install_path) return
    addMutation.mutate(addForm, {
      onSuccess: () => { setShowAdd(false); setAddForm({ name: "", display_name: "", install_path: "", config_dir: "", deploy_method: "symlink" }) }
    })
  }

  const activeCount = tools?.filter((t) => t.is_active).length ?? 0

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("nav.tools")}</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {activeCount} of {tools?.length ?? 0} tools connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={detectMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
          >
            {detectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Scan for Tools
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Custom Tool
          </button>
        </div>
      </div>

      {/* Tool Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : !tools || tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Wrench className="h-16 w-16 text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)]">No tools detected</h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-1 mb-4">
            Click "Scan for Tools" to auto-detect installed AI coding assistants
          </p>
          <button onClick={handleScan}
            className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white">
            Scan Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onToggleActive={(id, active) => updateMutation.mutate({ id, input: { is_active: active } })}
              onRemove={(id) => { if (confirm("Remove this tool?")) removeMutation.mutate(id) }}
              onDeployAll={(id) => deployAllMutation.mutate({ skillIds: [], toolId: id })}
            />
          ))}
        </div>
      )}

      {/* Add Tool Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
             onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-2xl p-6"
               onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Add Custom Tool</h2>
            <div className="space-y-3">
              <InputField label="Slug *" value={addForm.name} onChange={(v) => setAddForm({ ...addForm, name: v })} placeholder="my-custom-tool" />
              <InputField label="Display Name *" value={addForm.display_name} onChange={(v) => setAddForm({ ...addForm, display_name: v })} placeholder="My Custom Tool" />
              <InputField label="Install Path *" value={addForm.install_path} onChange={(v) => setAddForm({ ...addForm, install_path: v })} placeholder="~/.my-tool" />
              <InputField label="Config Dir" value={addForm.config_dir ?? ""} onChange={(v) => setAddForm({ ...addForm, config_dir: v })} placeholder=".my-tool/skills" />
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Deploy Method</label>
                <select value={addForm.deploy_method} onChange={(e) => setAddForm({ ...addForm, deploy_method: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1">
                  <option value="symlink">Symlink (live sync)</option>
                  <option value="copy">Copy (independent)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={addMutation.isPending}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {addMutation.isPending ? "Adding..." : "Add Tool"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[var(--brand-primary)]" />
    </div>
  )
}

function ToolCard({ tool, onToggleActive, onRemove, onDeployAll }: {
  tool: ToolDTO
  onToggleActive: (id: string, active: boolean) => void
  onRemove: (id: string) => void
  onDeployAll: (id: string) => void
}) {
  const isConnected = tool.is_active && tool.last_detected != null

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-background)]">
            <Wrench className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{tool.display_name}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">{tool.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Circle
            className={cn("h-2.5 w-2.5", isConnected ? "text-green-500 fill-green-500" : "text-[var(--text-tertiary)]")}
            stroke="none"
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-tertiary)]">Config:</span>
          <span className="text-[var(--text-secondary)] font-mono">{tool.config_dir ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-tertiary)]">Method:</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium",
            tool.deploy_method === "symlink" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          )}>
            {tool.deploy_method}
          </span>
        </div>
        {tool.last_detected && (
          <div className="flex justify-between">
            <span className="text-[var(--text-tertiary)]">Last seen:</span>
            <span className="text-[var(--text-secondary)]">{new Date(tool.last_detected).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
        <button
          onClick={() => onToggleActive(tool.id, !tool.is_active)}
          className={cn(
            "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
            tool.is_active
              ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300"
              : "bg-[var(--surface-background)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
          )}
        >
          {tool.is_active ? "Active" : "Inactive"}
        </button>
        <button
          onClick={() => onDeployAll(tool.id)}
          className="rounded px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
          title="Deploy all active skills"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onRemove(tool.id)}
          className="rounded px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
