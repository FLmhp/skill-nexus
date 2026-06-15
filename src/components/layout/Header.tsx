import { Sun, Moon, RefreshCw } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

const routeTitles: Record<string, string> = {
  "/": "dashboard.title",
  "/skills": "skills.title",
  "/graph": "graph.title",
  "/marketplace": "marketplace.title",
  "/agents": "agents.title",
  "/mcp": "mcp.title",
  "/security": "security.title",
  "/settings": "settings.title",
};

function getTitleKey(pathname: string): string {
  if (pathname.startsWith("/skills/")) return "skillDetail.title";
  return routeTitles[pathname] ?? "Skill Nexus";
}

export default function Header() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const activeRoute = useUiStore((s) => s.activeRoute);
  const { t } = useI18n();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6">
      <h1 className="text-lg font-semibold text-foreground">{t(getTitleKey(activeRoute))}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={t("common.refresh")}
          aria-label={t("common.refresh")}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={toggleTheme}
          className={cn(
            "rounded-md p-2 transition-colors",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={theme === "dark" ? t("settings.light") : t("settings.dark")}
          aria-label={theme === "dark" ? t("settings.light") : t("settings.dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
