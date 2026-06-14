import { Sun, Moon, RefreshCw } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/skills": "Skills",
  "/graph": "Knowledge Graph",
  "/marketplace": "Marketplace",
  "/agents": "Agents",
  "/mcp": "MCP Servers",
  "/security": "Security Scan",
  "/settings": "Settings",
};

function getTitle(pathname: string): string {
  if (pathname.startsWith("/skills/")) return "Skill Detail";
  return routeTitles[pathname] ?? "Skill Nexus";
}

export default function Header() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const activeRoute = useUiStore((s) => s.activeRoute);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6">
      <h1 className="text-lg font-semibold text-foreground">{getTitle(activeRoute)}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={toggleTheme}
          className={cn(
            "rounded-md p-2 transition-colors",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
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
