import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/types";

export async function getAppSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_app_settings");
}

export async function updateAppSettings(settings: AppSettings): Promise<AppSettings> {
  return invoke<AppSettings>("update_app_settings", { settings });
}

export async function clearAppData(): Promise<void> {
  return invoke<void>("clear_app_data");
}
