import { useState, useEffect, useCallback } from "react";
import { Search, Store, Loader2, AlertCircle } from "lucide-react";
import { searchMarketplace } from "@/api/marketplace";
import type { MarketplaceSkill, MarketplaceSourceError } from "@/types";
import MarketplaceCard from "@/components/marketplace/MarketplaceCard";
import { toUserError } from "@/lib/apiError";
import { useI18n } from "@/i18n";

const marketplaceSources = [
  { value: "all", label: "All sources" },
  { value: "skillsmp", label: "SkillsMP" },
  { value: "mcpmarket", label: "MCPMarket" },
  { value: "skills-sh-directory", label: "skills.sh directory" },
];

export default function Marketplace() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [source, setSource] = useState("all");
  const [sourceErrors, setSourceErrors] = useState<MarketplaceSourceError[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchMarketplace(query.trim(), source);
      setSkills(results.skills);
      setSourceErrors(results.source_errors);
      setHasSearched(true);
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }, [query, source]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [query, handleSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("marketplace.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("marketplace.subtitle")}</p>
      </div>

      <div className="flex max-w-3xl flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("marketplace.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {marketplaceSources.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {sourceErrors.length > 0 && (
        <div className="space-y-2">
          {sourceErrors.map((item) => (
            <div
              key={`${item.source}-${item.message}`}
              className="flex items-center gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{item.source}:</span>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 && hasSearched ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Store className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">{t("marketplace.noResults", { query })}</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Store className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">{t("marketplace.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <MarketplaceCard
              key={`${skill.source}-${skill.id}`}
              skill={skill}
              onInstalled={handleSearch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
