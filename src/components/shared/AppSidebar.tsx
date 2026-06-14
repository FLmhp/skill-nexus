import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useUIStore } from "../../stores/useUIStore"
import { cn } from "../../lib/cn"
import { ROUTES } from "../../lib/constants"
import {
  LayoutDashboard,
  Package,
  Code2,
  Blocks,
  GitGraph,
  FlaskConical,
  BarChart3,
  Store,
  Wrench,
  Settings,
  FolderKanban,
} from "lucide-react"

const navItems = [
  { path: ROUTES.DASHBOARD, label: "nav.dashboard", icon: LayoutDashboard },
  { path: ROUTES.SKILLS, label: "nav.skills", icon: Package },
  { path: ROUTES.EDITOR, label: "nav.editor", icon: Code2 },
  { path: ROUTES.BUILDER, label: "nav.builder", icon: Blocks },
  { path: ROUTES.GRAPH, label: "nav.graph", icon: GitGraph },
  { path: ROUTES.SANDBOX, label: "nav.sandbox", icon: FlaskConical },
  { path: ROUTES.ANALYTICS, label: "nav.analytics", icon: BarChart3 },
  { path: ROUTES.MARKETPLACE, label: "nav.marketplace", icon: Store },
  { path: ROUTES.TOOLS, label: "nav.tools", icon: Wrench },
  { path: ROUTES.SETTINGS, label: "nav.settings", icon: Settings },
  { path: ROUTES.PROJECTS, label: "nav.projects", icon: FolderKanban },
]

export function AppSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarExpanded, toggleSidebar } = useUIStore()

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--border-default)] bg-[var(--surface-panel)] transition-all duration-200 ease-in-out",
        sidebarExpanded ? "w-[var(--sidebar-expanded-width)]" : "w-[var(--sidebar-width)]"
      )}
      onMouseEnter={() => toggleSidebar()}
      onMouseLeave={() => toggleSidebar()}
    >
      {/* App logo */}
      <div className="flex h-12 items-center justify-center border-b border-[var(--border-default)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white font-bold text-sm">
          SN
        </div>
        {sidebarExpanded && (
          <span className="ml-3 font-semibold text-sm whitespace-nowrap text-[var(--text-primary)]">
            {t("app.name")}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex w-full items-center px-3 py-2.5 text-sm transition-colors",
              "hover:bg-[var(--brand-primary-soft)]",
              isActive(item.path)
                ? "text-[var(--brand-primary)] bg-[var(--brand-primary-soft)]"
                : "text-[var(--text-secondary)]"
            )}
            title={sidebarExpanded ? undefined : t(item.label)}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {sidebarExpanded && (
              <span className="ml-3 whitespace-nowrap">{t(item.label)}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
