import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSkillStore } from "@/stores/skillStore";
import { useI18n } from "@/i18n";
import { Search, ScanSearch, Loader2, AlertCircle, Puzzle } from "lucide-react";
import SkillCard from "@/components/skills/SkillCard";

export default function Skills() {
  const navigate = useNavigate();
  const {
    skills,
    loading,
    error,
    searchQuery,
    fetchSkills,
    scanAndImport,
    setSearchQuery,
    lastScanSummary,
  } = useSkillStore();
  const { t } = useI18n();

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("skills.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("skills.subtitle", {
              count: skills.length,
              plural: skills.length !== 1 ? "s" : "",
            })}
          </p>
        </div>
        <button
          onClick={scanAndImport}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4" />
          )}
          {t("skills.scanImport")}
        </button>
      </div>

      {lastScanSummary && (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {t("skills.lastScanSummary", {
            paths: lastScanSummary.scanned_paths,
            imported: lastScanSummary.imported,
            updated: lastScanSummary.updated,
            skipped: lastScanSummary.skipped,
            errors: lastScanSummary.errors.length,
          })}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("skills.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && skills.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Puzzle className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">
            {skills.length === 0
              ? t("skills.noSkills")
              : t("skills.noMatch")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onClick={() => navigate(`/skills/${skill.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
