import { useState } from "react";
import type { MarketplaceSkill } from "@/types";
import { installFromUrl } from "@/api/marketplace";
import { cn } from "@/lib/utils";
import { Download, Star, User, Check, Loader2 } from "lucide-react";

interface MarketplaceCardProps {
  skill: MarketplaceSkill;
}

export default function MarketplaceCard({ skill }: MarketplaceCardProps) {
  const [installed, setInstalled] = useState(skill.installed);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await installFromUrl(skill.source_url);
      setInstalled(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground">{skill.name}</h3>
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Star className="h-3 w-3 fill-current" />
          {skill.rating.toFixed(1)}
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {skill.description}
      </p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {skill.author}
        </span>
        <span>v{skill.version}</span>
        <span>{(skill.downloads / 1000).toFixed(1)}k</span>
      </div>

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      <button
        onClick={handleInstall}
        disabled={installed || installing}
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          installed
            ? "bg-green-500/10 text-green-400 cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        )}
      >
        {installing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : installed ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {installed ? "Installed" : installing ? "Installing..." : "Install"}
      </button>
    </div>
  );
}
