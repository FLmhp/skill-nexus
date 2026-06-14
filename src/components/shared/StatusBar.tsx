import { useQuery } from "@tanstack/react-query"
import { getOverviewStats, getDeploymentStatus } from "../../services/ipc"
import { Circle, Loader2 } from "lucide-react"

export function StatusBar() {
  const { data: stats } = useQuery({
    queryKey: ["system", "overview"],
    queryFn: getOverviewStats,
    refetchInterval: 30_000,
  })

  const { data: deploys } = useQuery({
    queryKey: ["deployments", "status"],
    queryFn: getDeploymentStatus,
    refetchInterval: 30_000,
  })

  const activeTools = stats?.connected_tools ?? 0
  const totalSkills = stats?.total_skills ?? 0
  const activeDeploys = deploys?.filter((d) => d.status === "active").length ?? 0

  return (
    <footer className="flex h-[var(--statusbar-height)] items-center justify-between border-t border-[var(--border-default)] bg-[var(--surface-panel)] px-3 text-xs text-[var(--text-tertiary)]">
      <div className="flex items-center gap-4">
        <span>{totalSkills} skills</span>
        <span className="flex items-center gap-1">
          <Circle
            className="h-2 w-2"
            fill={activeTools > 0 ? "var(--status-good)" : "var(--text-tertiary)"}
            stroke="none"
          />
          {activeTools} tools connected
        </span>
        {activeDeploys > 0 && (
          <span>{activeDeploys} active deployments</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>Skills Nexus v0.1.0</span>
      </div>
    </footer>
  )
}
