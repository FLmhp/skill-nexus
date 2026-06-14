import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUiStore } from "@/stores/uiStore";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Skills from "@/pages/Skills";
import SkillDetail from "@/pages/SkillDetail";
import Graph from "@/pages/Graph";
import Marketplace from "@/pages/Marketplace";
import Agents from "@/pages/Agents";
import McpServers from "@/pages/McpServers";
import Security from "@/pages/Security";
import Settings from "@/pages/Settings";

export default function App() {
  const location = useLocation();
  const setActiveRoute = useUiStore((s) => s.setActiveRoute);

  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location.pathname, setActiveRoute]);

  return (
    <Layout>
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
    </Layout>
  );
}
