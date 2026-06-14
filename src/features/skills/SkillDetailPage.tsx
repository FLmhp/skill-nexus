import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft, Edit3, Trash2, Copy, Download, History, RotateCcw,
  Info, GitBranch, Loader2, Clock, Check, X,
  RefreshCw, Link2, Unlink, Play
} from "lucide-react"
import {
  useSkill, useSkillVersions, useDeleteSkill,
  useDuplicateSkill, useExportSkill, useRestoreSkillVersion
} from "../../hooks/useSkills"
import { useDeployments, useDeploySkill, useUndeploySkill, useToolsList } from "../../hooks/useDeployments"
import { cn } from "../../lib/cn"

type Tab = "info" | "versions" | "deployments"

export function SkillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t: _t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>("info")
  const [diffVersion, setDiffVersion] = useState<number | null>(null)

  const { data: skill, isLoading, isError } = useSkill(id)
  const { data: versions } = useSkillVersions(id)
  const deleteMutation = useDeleteSkill()
  const duplicateMutation = useDuplicateSkill()
  const exportMutation = useExportSkill()
  const restoreMutation = useRestoreSkillVersion()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (isError || !skill) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-[var(--text-secondary)]">Skill not found</p>
        <button onClick={() => navigate("/skills")} className="text-sm text-[var(--brand-primary)]">
          Back to Skills
        </button>
      </div>
    )
  }

  const tags: string[] = (() => {
    try { return JSON.parse(skill.tags) } catch { return [] }
  })()

  const tabs: { key: Tab; label: string; icon: typeof Info }[] = [
    { key: "info", label: "Info", icon: Info },
    { key: "versions", label: `Versions (${versions?.length ?? 0})`, icon: History },
    { key: "deployments", label: "Deployments", icon: GitBranch },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/skills")} className="rounded p-1 hover:bg-[var(--surface-elevated)]">
              <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{skill.name}</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {skill.description || "No description"} · v{skill.version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportMutation.mutate({ id: skill.id, format: "Markdown" })}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => duplicateMutation.mutate({ id: skill.id })}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button onClick={() => navigate(`/editor/${skill.id}`)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-medium text-white">
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            <button onClick={() => { if (confirm("Delete this skill?")) { deleteMutation.mutate(skill.id); navigate("/skills") } }}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "info" && (
          <div className="max-w-3xl space-y-6">
            {/* Metadata */}
            <section className="grid grid-cols-2 gap-4">
              <MetaItem label="Type" value={skill.type} />
              <MetaItem label="Category" value={skill.category ?? "—"} />
              <MetaItem label="Author" value={skill.author || "—"} />
              <MetaItem label="Format" value={skill.format} />
              <MetaItem label="Created" value={new Date(skill.created_at).toLocaleString()} />
              <MetaItem label="Updated" value={new Date(skill.updated_at).toLocaleString()} />
              <MetaItem label="Content Hash" value={skill.content_hash?.slice(0, 12) ?? "—"} />
              <MetaItem label="Active" value={skill.is_active ? "Yes" : "No"} />
            </section>

            {/* Tags */}
            {tags.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-md text-xs bg-[var(--surface-background)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Content Preview */}
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Content</h3>
              <pre className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-background)] p-4 text-sm font-mono text-[var(--text-primary)] whitespace-pre-wrap overflow-auto max-h-80">
                {skill.content}
              </pre>
            </section>
          </div>
        )}

        {activeTab === "versions" && (
          <div className="max-w-3xl space-y-4">
            {versions && versions.length > 0 ? (
              <div className="space-y-2">
                {versions.map((v, i) => (
                  <div key={v.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                          i === 0 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-[var(--surface-background)] text-[var(--text-secondary)]"
                        )}>
                          {i === 0 ? <Check className="h-4 w-4" /> : `v${v.version}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Version {v.version}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {new Date(v.created_at).toLocaleString()}
                            {v.changelog && ` · ${v.changelog}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDiffVersion(diffVersion === v.version ? null : v.version)}
                          className={cn(
                            "rounded px-2 py-1 text-xs transition-colors",
                            diffVersion === v.version
                              ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
                          )}
                        >
                          {diffVersion === v.version ? "Hide Diff" : "Compare"}
                        </button>
                        {i > 0 && (
                          <button
                            onClick={() => {
                              if (confirm(`Restore to version ${v.version}?`)) {
                                restoreMutation.mutate({ skillId: skill.id, version: v.version })
                              }
                            }}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
                          >
                            <RotateCcw className="h-3 w-3" /> Restore
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Diff view */}
                    {diffVersion === v.version && (
                      <div className="mt-3 rounded border border-[var(--border-default)] bg-[var(--surface-background)] p-3">
                        <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap overflow-auto max-h-60">
                          {v.content}
                        </pre>
                        {i > 0 && versions[i - 1] && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
                            <p className="text-xs text-[var(--text-tertiary)] mb-1">Changes from version {v.version}:</p>
                            <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-60">
                              {generateDiff(versions[i - 1].content, v.content)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <Clock className="h-10 w-10 text-[var(--text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--text-tertiary)]">No version history yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "deployments" && (
          <DeploymentsTab skillId={skill.id} skillName={skill.name} />
        )}
      </div>
    </div>
  )
}

function DeploymentsTab({ skillId, skillName }: { skillId: string; skillName: string }) {
  const { data: tools } = useToolsList()
  const { data: deployments } = useDeployments(skillId)
  const deployMutation = useDeploySkill()
  const undeployMutation = useUndeploySkill()

  const deployedToolIds = new Set(deployments?.filter((d) => d.status === "active").map((d) => d.tool_id) ?? [])

  if (!tools || tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <GitBranch className="h-10 w-10 text-[var(--text-tertiary)] mb-2" />
        <p className="text-sm text-[var(--text-tertiary)]">No tools configured</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Scan for AI tools in the Tools page first</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-2xl">
      <p className="text-sm text-[var(--text-secondary)] mb-2">
        Deploy "{skillName}" to your AI coding tools
      </p>
      {tools.filter((t) => t.is_active).map((tool) => {
        const isDeployed = deployedToolIds.has(tool.id)
        const dep = deployments?.find((d) => d.tool_id === tool.id)

        return (
          <div key={tool.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                isDeployed ? "bg-green-100 dark:bg-green-900" : "bg-[var(--surface-background)]"
              )}>
                {isDeployed ? (
                  <Link2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Unlink className="h-4 w-4 text-[var(--text-tertiary)]" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{tool.display_name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {isDeployed
                    ? `Deployed via ${dep?.deploy_method ?? "symlink"} · ${dep?.deploy_path ?? tool.config_dir ?? ""}`
                    : `Not deployed · ${tool.deploy_method} mode`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDeployed ? (
                <>
                  <button
                    onClick={() => undeployMutation.mutate({ skillId, toolId: tool.id })}
                    disabled={undeployMutation.isPending}
                    className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    <X className="h-3 w-3 inline mr-1" />Undeploy
                  </button>
                  <button
                    onClick={() => deployMutation.mutate({ skillId, toolId: tool.id })}
                    disabled={deployMutation.isPending}
                    className="rounded border border-[var(--border-default)] px-3 py-1.5 text-xs hover:bg-[var(--surface-elevated)]"
                    title="Re-sync deployment"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => deployMutation.mutate({ skillId, toolId: tool.id })}
                  disabled={deployMutation.isPending}
                  className="flex items-center gap-1 rounded bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  <Play className="h-3 w-3" /> Deploy
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
      <p className="text-sm text-[var(--text-primary)] mt-0.5">{value}</p>
    </div>
  )
}

// Simple line-by-line diff
function generateDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  const result: string[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]
    if (oldLine === undefined) {
      result.push(`+ ${newLine}`)
    } else if (newLine === undefined) {
      result.push(`- ${oldLine}`)
    } else if (oldLine !== newLine) {
      result.push(`- ${oldLine}`)
      result.push(`+ ${newLine}`)
    }
  }

  return result.join("\n")
}
