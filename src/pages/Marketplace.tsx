import { useState, useEffect, useCallback } from "react";
import { Search, Store, Loader2, AlertCircle } from "lucide-react";
import { searchMarketplace } from "@/api/marketplace";
import type { MarketplaceSkill } from "@/types";
import MarketplaceCard from "@/components/marketplace/MarketplaceCard";

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchMarketplace(query.trim());
      setSkills(results);
      setHasSearched(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

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
        <h2 className="text-2xl font-bold text-foreground">Marketplace</h2>
        <p className="text-sm text-muted-foreground">
          Discover and install skills from the community
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search marketplace..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 && hasSearched ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Store className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">No results found for &quot;{query}&quot;</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Store className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">Search to discover community skills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <MarketplaceCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
