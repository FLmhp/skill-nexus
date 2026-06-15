import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUiStore } from "@/stores/uiStore";
import Layout from "@/components/layout/Layout";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Skills = lazy(() => import("@/pages/Skills"));
const SkillDetail = lazy(() => import("@/pages/SkillDetail"));
const Graph = lazy(() => import("@/pages/Graph"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const Agents = lazy(() => import("@/pages/Agents"));
const McpServers = lazy(() => import("@/pages/McpServers"));
const Security = lazy(() => import("@/pages/Security"));
const Settings = lazy(() => import("@/pages/Settings"));

export default function App() {
  const location = useLocation();
  const setActiveRoute = useUiStore((s) => s.setActiveRoute);

  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location.pathname, setActiveRoute]);

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/skills/:id" element={<SkillDetail />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/mcp" element={<McpServers />} />
          <Route path="/security" element={<Security />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
