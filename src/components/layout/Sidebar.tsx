import { NavLink } from "react-router-dom";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Puzzle,
  GitGraph,
  Store,
  Bot,
  Server,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "@/i18n";
import logoUrl from "@/assets/logo.png";

const navItems = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/skills", icon: Puzzle, labelKey: "nav.skills" },
  { to: "/graph", icon: GitGraph, labelKey: "nav.graph" },
  { to: "/marketplace", icon: Store, labelKey: "nav.marketplace" },
  { to: "/agents", icon: Bot, labelKey: "nav.agents" },
  { to: "/mcp", icon: Server, labelKey: "nav.mcp" },
  { to: "/security", icon: Shield, labelKey: "nav.security" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

export default function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { t } = useI18n();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
            <img src={logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
            <span className="font-semibold text-sm text-foreground">Skill Nexus</span>
          </div>
        )}
        {sidebarCollapsed && (
          <img src={logoUrl} alt="" className="mx-auto h-7 w-7 rounded-md object-cover" />
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            sidebarCollapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="mx-auto mt-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                sidebarCollapsed && "justify-center px-2"
              )
            }
            title={sidebarCollapsed ? t(item.labelKey) : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        {!sidebarCollapsed && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Skill Nexus v{__APP_VERSION__}</p>
        )}
      </div>
    </aside>
  );
}
