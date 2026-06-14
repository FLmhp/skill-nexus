import { useUiStore } from "@/stores/uiStore";
import { Sun, Moon, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Settings() {
  const { theme, toggleTheme } = useUiStore();
  const [scanPaths, setScanPaths] = useState(() => localStorage.getItem("extraScanPaths") ?? "");
  const [saved, setSaved] = useState(false);

  const handleSavePaths = () => {
    if (scanPaths.trim()) {
      localStorage.setItem("extraScanPaths", scanPaths.trim());
    } else {
      localStorage.removeItem("extraScanPaths");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure Skill Nexus preferences</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-sm text-foreground">Appearance</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Toggle between dark and light mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Dark
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-sm text-foreground">Scan Paths</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Extra Scan Paths</p>
            <p className="text-xs text-muted-foreground mb-2">
              Comma-separated paths to scan for skills in addition to defaults
            </p>
            <textarea
              value={scanPaths}
              onChange={(e) => setScanPaths(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              rows={3}
              placeholder="C:\Users\me\.agents\skills,D:\projects\skills"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSavePaths}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {saved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-sm text-foreground">Data</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Data Directory</p>
            <code className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1 mt-1 block">
              %APPDATA%/com.skill-nexus.app
            </code>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear Database
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-sm text-foreground">About</h3>
        </div>
        <div className="px-6 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Skill Nexus</span>
            <span className="text-xs text-muted-foreground font-mono">v0.1.0</span>
          </div>
          <p className="text-xs text-muted-foreground">
            A desktop application for managing, scanning, and visualizing AI agent skills.
            Built with React 19, TypeScript, Tauri 2, Cytoscape.js, and Rust.
          </p>
        </div>
      </div>
    </div>
  );
}
