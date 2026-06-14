import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSkillStore } from "@/stores/skillStore";
import { useScan } from "@/hooks/useScan";
import * as skillsApi from "@/api/skills";
import type { Skill } from "@/types";
import {
  ArrowLeft,
  Trash2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Folder,
  Globe,
  FileText,
  Puzzle,
  ScanSearch,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export default function SkillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteSkill, loading: storeLoading } = useSkillStore();
  const { scanSingle, loading: scanLoading } = useScan();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    skillsApi
      .getSkill(id)
      .then((s) => {
        setSkill(s);
        return skillsApi.getSkillContent(id);
      })
      .then((c) => setContent(c))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteSkill(id);
    navigate("/skills");
  };

  const handleScan = async () => {
    if (!id) return;
    const result = await scanSingle(id);
    if (result) {
      setRiskScore(result.risk_score);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/skills")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Skills
        </button>
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || "Skill not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => navigate("/skills")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Skills
      </button>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Puzzle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{skill.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {skill.version && <span className="mr-2">v{skill.version}</span>}
                  {skill.agent_type && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                      {skill.agent_type}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleScan}
                disabled={scanLoading}
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
              >
                {scanLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="h-4 w-4" />
                )}
                Scan
              </button>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  disabled={storeLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confirm?</span>
                  <button
                    onClick={handleDelete}
                    disabled={storeLoading}
                    className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">{skill.description || "No description"}</p>

          {riskScore !== null && (
            <div className="flex items-center gap-3 rounded-md border border-border p-3 bg-muted/30">
              <ShieldCheck
                className={cn(
                  "h-5 w-5",
                  riskScore < 3
                    ? "text-green-400"
                    : riskScore < 7
                      ? "text-yellow-400"
                      : "text-red-400"
                )}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Risk Score: {riskScore}/10
                </p>
                <div className="mt-1 h-1.5 w-32 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      riskScore < 3
                        ? "bg-green-500"
                        : riskScore < 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    )}
                    style={{ width: `${riskScore * 10}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <MetaItem icon={User} label="Author" value={skill.author} />
            <MetaItem icon={Calendar} label="Installed" value={formatDate(skill.installed_at)} />
            <MetaItem icon={Folder} label="Path" value={skill.path} />
            <MetaItem icon={Globe} label="Source" value={skill.source_url} />
            <MetaItem icon={FileText} label="License" value={skill.license} />
            <MetaItem icon={Calendar} label="Updated" value={formatDate(skill.updated_at)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-3">
          <h3 className="font-semibold text-sm text-foreground">Content</h3>
        </div>
        <div className="p-6">
          {content ? (
            <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground bg-muted/30 rounded-md p-4 max-h-96 overflow-auto scrollbar-thin">
              {content}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No content available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground truncate">{value || "—"}</span>
    </div>
  );
}
