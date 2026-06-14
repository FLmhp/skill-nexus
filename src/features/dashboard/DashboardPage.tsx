import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Package, Wrench, BarChart3, Zap, Plus, ArrowRight, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getOverviewStats } from "../../services/ipc"

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ["system", "overview"],
    queryFn: getOverviewStats,
    refetchInterval: 30_000,
  })

  const statCards = [
    { label: "Total Skills", value: stats?.total_skills ?? 0, icon: Package, color: "var(--brand-primary)" },
    { label: "Connected Tools", value: stats?.connected_tools ?? 0, icon: Wrench, color: "var(--brand-secondary)" },
    { label: "Tests Run", value: stats?.tests_run ?? 0, icon: BarChart3, color: "var(--brand-accent)" },
    { label: "Active Deployments", value: stats?.total_deployments ?? 0, icon: Zap, color: "var(--status-info)" },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {t("nav.dashboard")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t("app.tagline")}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
              <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" /> : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/editor/new")}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--border-default)] p-3 text-left text-sm hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)]">
                <Plus className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Create Skill</p>
                <p className="text-xs text-[var(--text-tertiary)]">Write a new skill from scratch</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-[var(--text-tertiary)]" />
            </button>
            <button
              onClick={() => navigate("/marketplace")}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--border-default)] p-3 text-left text-sm hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)]">
                <Package className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Browse Marketplace</p>
                <p className="text-xs text-[var(--text-tertiary)]">Discover community skills</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-[var(--text-tertiary)]" />
            </button>
            <button
              onClick={() => navigate("/tools")}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--border-default)] p-3 text-left text-sm hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)]">
                <Wrench className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Manage Tools</p>
                <p className="text-xs text-[var(--text-tertiary)]">Configure AI tool integrations</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-[var(--text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Getting Started</h3>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>1. <strong>Create</strong> a skill — write instructions for AI assistants</p>
            <p>2. <strong>Deploy</strong> it to your favorite AI coding tools</p>
            <p>3. <strong>Test</strong> it in the sandbox to measure effectiveness</p>
            <p>4. <strong>Share</strong> it with the community via marketplace</p>
          </div>
        </div>
      </div>
    </div>
  )
}
