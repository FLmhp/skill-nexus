import type { ReactNode } from "react";
import { useUiStore } from "@/stores/uiStore";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div
        className={`flex flex-1 flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-60"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
