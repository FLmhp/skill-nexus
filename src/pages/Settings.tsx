import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { useI18n, setLanguage as setAppLanguage, type Language } from "@/i18n";
import * as settingsApi from "@/api/settings";
import type { AppSettings } from "@/types";
import logoUrl from "@/assets/logo.png";
import { toUserError } from "@/lib/apiError";

const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  extra_scan_paths: [],
  auto_watch_enabled: false,
};

export default function Settings() {
  const { theme, toggleTheme } = useUiStore();
  const { language, t } = useI18n();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [scanPaths, setScanPaths] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    settingsApi
      .getAppSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setScanPaths(data.extra_scan_paths.join("\n"));
        setAppLanguage(data.language);
      })
      .catch((err) => {
        if (!cancelled) setError(toUserError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (nextSettings?: AppSettings) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await settingsApi.updateAppSettings(
        nextSettings ?? {
          ...settings,
          extra_scan_paths: parseScanPaths(scanPaths),
        }
      );
      setSettings(updated);
      setScanPaths(updated.extra_scan_paths.join("\n"));
      setAppLanguage(updated.language);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (nextLanguage: Language) => {
    const nextSettings = {
      ...settings,
      language: nextLanguage,
      extra_scan_paths: parseScanPaths(scanPaths),
    };
    setSettings(nextSettings);
    setAppLanguage(nextLanguage);
    await handleSave(nextSettings);
  };

  const handleClearDatabase = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearing(true);
    setError(null);
    try {
      await settingsApi.clearAppData();
      setSettings(DEFAULT_SETTINGS);
      setScanPaths("");
      setAppLanguage(DEFAULT_SETTINGS.language);
      setConfirmClear(false);
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("settings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.appearance")}</h3>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("settings.theme")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.themeDesc")}</p>
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
                  {t("settings.light")}
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  {t("settings.dark")}
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("settings.language")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
            </div>
            <select
              value={language}
              onChange={(event) => void handleLanguageChange(event.target.value as Language)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="en">{t("settings.english")}</option>
              <option value="zh">{t("settings.chinese")}</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.scanPaths")}</h3>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t("settings.extraPaths")}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t("settings.extraPathsDesc")}</p>
            <textarea
              value={scanPaths}
              onChange={(e) => setScanPaths(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              rows={3}
              placeholder="C:\Users\me\.agents\skills, D:\projects\skills"
            />
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved ? t("settings.saved") : t("settings.save")}
            </button>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={settings.auto_watch_enabled}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  auto_watch_enabled: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {t("settings.autoWatch")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("settings.autoWatchDesc")}
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.data")}</h3>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t("settings.dataDir")}</p>
            <code className="mt-1 block rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
              %APPDATA%/com.skillnexus.desktop
            </code>
          </div>
          <button
            onClick={() => void handleClearDatabase()}
            disabled={clearing}
            className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {clearing
              ? t("settings.clearing")
              : confirmClear
                ? t("settings.clearDbConfirm")
                : t("settings.clearDb")}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.about")}</h3>
        </div>
        <div className="space-y-2 px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
            <span className="text-sm text-foreground">Skill Nexus</span>
            <span className="font-mono text-xs text-muted-foreground">v0.1.0</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.aboutText")}</p>
        </div>
      </section>
    </div>
  );
}

function parseScanPaths(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((path) => path.trim())
    .filter(Boolean);
}
