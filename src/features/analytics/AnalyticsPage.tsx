import { useQuery } from "@tanstack/react-query"
import { BarChart3, TrendingUp, Zap, Package, Wrench, Loader2 } from "lucide-react"
import { getOverviewStats, getDeploymentStatus } from "../../services/ipc"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"]

export function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["system", "overview"],
    queryFn: getOverviewStats,
    refetchInterval: 30_000,
  })

  const { data: deploys } = useQuery({
    queryKey: ["deployments", "status"],
    queryFn: getDeploymentStatus,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  // Compute derived data for charts
  const deploymentByTool = new Map<string, number>()
  deploys?.forEach((d) => {
    if (d.status === "active") {
      deploymentByTool.set(d.tool_name, (deploymentByTool.get(d.tool_name) ?? 0) + 1)
    }
  })
  const toolData = Array.from(deploymentByTool.entries()).map(([name, count]) => ({ name, count }))

  const overviewData = [
    { name: "Skills", value: stats?.total_skills ?? 0, color: COLORS[0] },
    { name: "Tools", value: stats?.connected_tools ?? 0, color: COLORS[1] },
    { name: "Deployments", value: stats?.total_deployments ?? 0, color: COLORS[2] },
    { name: "Tests", value: stats?.tests_run ?? 0, color: COLORS[3] },
  ]

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Usage metrics and skill effectiveness
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4">
        {overviewData.map((item) => (
          <div key={item.name} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </div>
            <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Overview pie */}
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Overview Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={overviewData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, value }) => `${name}: ${value}`}>
                {overviewData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tool distribution */}
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Deployments by Tool</h3>
          {toolData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-[var(--text-tertiary)]">
              <Wrench className="h-10 w-10 mb-2" />
              <p className="text-sm">No deployments yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={toolData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Deployments" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Effectiveness ranking placeholder */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Effectiveness Ranking</h3>
        <p className="text-sm text-[var(--text-tertiary)] text-center py-10">
          Run tests in the Testing Sandbox to populate effectiveness scores
        </p>
      </div>
    </div>
  )
}
