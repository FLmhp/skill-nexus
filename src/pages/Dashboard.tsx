import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSkillStore } from "@/stores/skillStore";
import { useAgentStore } from "@/stores/agentStore";
import { useScan } from "@/hooks/useScan";
import { useI18n } from "@/i18n";
import {
  Puzzle,
  Bot,
  Shield,
  Store,
  ScanSearch,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn, riskBadgeClass, clampRiskScore } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    skills,
    loading: skillsLoading,
    error: skillsError,
    lastScanSummary,
    fetchSkills,
    scanAndImport,
  } = useSkillStore();
  const { agents, fetchAgents } = useAgentStore();
  const { results: scanResults, loading: scanLoading, scanAll, fetchResults } = useScan();
  const { t } = useI18n();

  useEffect(() => {
    fetchSkills();
    fetchAgents();
    fetchResults();
  }, [fetchSkills, fetchAgents, fetchResults]);

  const stats = [
    {
      key: "skills",
      label: t("dashboard.totalSkills"),
      value: skills.length,
      icon: Puzzle,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      key: "agents",
      label: t("dashboard.agents"),
      value: agents.length,
      icon: Bot,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      key: "security",
      label: t("dashboard.recentScans"),
      value: scanResults.length,
      icon: Shield,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      key: "marketplace",
      label: t("dashboard.marketplace"),
      value: t("dashboard.explore"),
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
          <h2 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
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
          {t("dashboard.scanSkills")}
        </button>
      </div>

      {lastScanSummary && (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {t("dashboard.lastScanSummary", {
            paths: lastScanSummary.scanned_paths,
            imported: lastScanSummary.imported,
            updated: lastScanSummary.updated,
            skipped: lastScanSummary.skipped,
            errors: lastScanSummary.errors.length,
          })}
        </div>
      )}

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
              if (stat.key === "marketplace") navigate("/marketplace");
              if (stat.key === "agents") navigate("/agents");
              if (stat.key === "skills") navigate("/skills");
              if (stat.key === "security") navigate("/security");
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
            <h3 className="font-semibold text-foreground">{t("dashboard.recentSkills")}</h3>
          </div>
          <div className="divide-y divide-border">
            {skillsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : skills.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("dashboard.noSkills")}
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
            <h3 className="font-semibold text-foreground">{t("dashboard.securityOverview")}</h3>
            <button
              onClick={scanAll}
              disabled={scanLoading}
              className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {scanLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("dashboard.scanAll")
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
                {t("dashboard.noScans")}
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
                      riskBadgeClass(result.risk_score)
                    )}
                  >
                    {clampRiskScore(result.risk_score)}/100
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
