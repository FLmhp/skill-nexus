import { useTranslation } from "react-i18next"
import { useAppStore, type ThemeMode } from "../../stores/useAppStore"
import { Settings, Monitor, Sun, Moon, Globe } from "lucide-react"

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useAppStore()

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Monitor }[] = [
    { value: "system", label: t("settings.system"), icon: Monitor },
    { value: "light", label: t("settings.light"), icon: Sun },
    { value: "dark", label: t("settings.dark"), icon: Moon },
  ]

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t("nav.settings")}
      </h1>

      {/* Theme */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
          {t("settings.theme")}
        </h2>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                theme === opt.value
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
          {t("settings.language")}
        </h2>
        <div className="flex gap-2">
          {[
            { value: "en", label: "English" },
            { value: "zh", label: "中文" },
          ].map((lang) => (
            <button
              key={lang.value}
              onClick={() => i18n.changeLanguage(lang.value)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                i18n.language === lang.value
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <Globe className="h-4 w-4" />
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* AI Provider */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">AI Providers</h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          Configure API keys for the Testing Sandbox and AI recommendations. Keys are read from environment variables or set below.
        </p>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Anthropic API Key</label>
            <input type="password" placeholder="sk-ant-..." readOnly
              className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-background)] px-3 py-1.5 text-sm mt-1 font-mono opacity-50"
              value={import.meta.env.VITE_ANTHROPIC_API_KEY ? "••••••••" : ""} />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Set <code>ANTHROPIC_API_KEY</code> environment variable</p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3">
            <label className="text-xs font-medium text-[var(--text-secondary)]">OpenAI API Key</label>
            <input type="password" placeholder="sk-..." readOnly
              className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-background)] px-3 py-1.5 text-sm mt-1 font-mono opacity-50"
              value={import.meta.env.VITE_OPENAI_API_KEY ? "••••••••" : ""} />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Set <code>OPENAI_API_KEY</code> environment variable</p>
          </div>
        </div>
      </section>

      {/* Backup */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Backup & Restore</h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const { invoke } = await import("@tauri-apps/api/core")
                const path = await invoke("create_backup", { path: null })
                alert(`Backup created: ${path}`)
              } catch (e) { alert(`Backup failed: ${e}`) }
            }}
            className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Create Backup
          </button>
          <button
            onClick={async () => {
              try {
                const { open } = await import("@tauri-apps/plugin-dialog")
                const file = await open({ filters: [{ name: "SQLite DB", extensions: ["db"] }] })
                if (file) {
                  const { invoke } = await import("@tauri-apps/api/core")
                  await invoke("restore_backup", { path: file as string })
                  alert("Database restored. Restart the app for changes to take effect.")
                }
              } catch (e) { alert(`Restore failed: ${e}`) }
            }}
            className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm"
          >
            Restore Backup
          </button>
        </div>
      </section>

      {/* About */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">About</h2>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-[var(--text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Skills Nexus</p>
              <p className="text-xs text-[var(--text-tertiary)]">v0.1.0 — Cross-platform Skills Visual Manager</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
