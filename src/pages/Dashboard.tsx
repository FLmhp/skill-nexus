import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSkillStore } from "@/stores/skillStore";
import { useAgentStore } from "@/stores/agentStore";
import { useScan } from "@/hooks/useScan";
import {
  Puzzle,
  Bot,
  Shield,
  Store,
  ScanSearch,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { skills, loading: skillsLoading, error: skillsError, fetchSkills, scanAndImport } = useSkillStore();
  const { agents, fetchAgents } = useAgentStore();
  const { results: scanResults, loading: scanLoading, scanAll, fetchResults } = useScan();

  useEffect(() => {
    fetchSkills();
    fetchAgents();
    fetchResults();
  }, [fetchSkills, fetchAgents, fetchResults]);

  const stats = [
    {
      label: "Total Skills",
      value: skills.length,
      icon: Puzzle,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Agents",
      value: agents.length,
      icon: Bot,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "Recent Scans",
      value: scanResults.length,
      icon: Shield,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Marketplace",
      value: "Explore",
      icon: Store,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ];

  const handleScan = async () => {
    await scanAndImport();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Overview of your Skill Nexus ecosystem
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={skillsLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {skillsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4" />
          )}
          Scan Skills
        </button>
      </div>

      {skillsError && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {skillsError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20 cursor-pointer"
            onClick={() => {
              if (stat.label === "Marketplace") navigate("/marketplace");
              if (stat.label === "Agents") navigate("/agents");
              if (stat.label === "Total Skills") navigate("/skills");
              if (stat.label === "Recent Scans") navigate("/security");
            }}
          >
            <div className="flex items-center gap-3">
              <div className={cn("rounded-md p-2", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-semibold text-foreground">Recent Skills</h3>
          </div>
          <div className="divide-y divide-border">
            {skillsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : skills.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No skills found. Click &quot;Scan Skills&quot; to import skills.
              </div>
            ) : (
              skills.slice(0, 5).map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/skills/${skill.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">{skill.description}</p>
                  </div>
                  {skill.agent_type && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {skill.agent_type}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Security Overview</h3>
            <button
              onClick={scanAll}
              disabled={scanLoading}
              className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {scanLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Scan All"
              )}
            </button>
          </div>
          <div className="divide-y divide-border">
            {scanLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scanResults.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No scan results yet. Run a security scan to assess your skills.
              </div>
            ) : (
              scanResults.slice(0, 5).map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate("/security")}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{result.skill_name}</p>
                    <p className="text-xs text-muted-foreground">{result.recommendation}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      result.risk_score < 3
                        ? "bg-green-500/10 text-green-400"
                        : result.risk_score < 7
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {result.risk_score}/10
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
