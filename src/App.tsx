import { useEffect, Suspense, lazy, Component } from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAppStore, type ThemeMode } from "./stores/useAppStore"
import { MainLayout } from "./components/shared/MainLayout"
import { ROUTES } from "./lib/constants"
import { Loader2 } from "lucide-react"

// Eager-loaded core pages (fast initial load)
import { DashboardPage } from "./features/dashboard/DashboardPage"
import { SkillExplorerPage } from "./features/skills/SkillExplorerPage"
import { SkillDetailPage } from "./features/skills/SkillDetailPage"
import { SkillEditorPage } from "./features/editor/SkillEditorPage"
import { SettingsPage } from "./features/settings/SettingsPage"
import { ToolsPage } from "./features/tools/ToolsPage"

// Lazy-loaded heavy pages (React Flow, dagre, Recharts, @dnd-kit are code-split)
const SkillBuilderPage = lazy(() => import("./features/builder/SkillBuilderPage").then(m => ({ default: m.SkillBuilderPage })))
const DependencyGraphPage = lazy(() => import("./features/graph/DependencyGraphPage").then(m => ({ default: m.DependencyGraphPage })))
const TestingSandboxPage = lazy(() => import("./features/sandbox/TestingSandboxPage").then(m => ({ default: m.TestingSandboxPage })))
const AnalyticsPage = lazy(() => import("./features/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })))
const MarketplacePage = lazy(() => import("./features/marketplace/MarketplacePage").then(m => ({ default: m.MarketplacePage })))
const ProjectsPage = lazy(() => import("./features/projects/ProjectsPage").then(m => ({ default: m.ProjectsPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
    </div>
  )
}

// Error boundary to catch React render failures
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#ef4444' }}>
          <h1>App Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#888', marginTop: 10 }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (mode: ThemeMode) => {
      if (mode === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        root.classList.toggle("dark", prefersDark)
      } else {
        root.classList.toggle("dark", mode === "dark")
      }
    }

    applyTheme(theme)

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches)
      }
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [theme])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
        <HashRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.SKILLS} element={<SkillExplorerPage />} />
              <Route path={ROUTES.SKILL_DETAIL} element={<SkillDetailPage />} />
              <Route path={ROUTES.EDITOR} element={<SkillEditorPage />} />
              <Route path={ROUTES.BUILDER} element={<Suspense fallback={<PageLoader />}><SkillBuilderPage /></Suspense>} />
              <Route path={ROUTES.GRAPH} element={<Suspense fallback={<PageLoader />}><DependencyGraphPage /></Suspense>} />
              <Route path={ROUTES.SANDBOX} element={<Suspense fallback={<PageLoader />}><TestingSandboxPage /></Suspense>} />
              <Route path={ROUTES.ANALYTICS} element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
              <Route path={ROUTES.MARKETPLACE} element={<Suspense fallback={<PageLoader />}><MarketplacePage /></Suspense>} />
              <Route path={ROUTES.TOOLS} element={<ToolsPage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              <Route path={ROUTES.PROJECTS} element={<Suspense fallback={<PageLoader />}><ProjectsPage /></Suspense>} />
            </Route>
          </Routes>
        </HashRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
