import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAppData, getAppSettings, updateAppSettings } from "./settings";
import type { AppSettings } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe("settings api", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads app settings from Tauri", async () => {
    const settings: AppSettings = {
      language: "en",
      extra_scan_paths: [],
      auto_watch_enabled: false,
    };
    invokeMock.mockResolvedValue(settings);

    await expect(getAppSettings()).resolves.toEqual(settings);
    expect(invokeMock).toHaveBeenCalledWith("get_app_settings");
  });

  it("serializes settings updates under the settings argument", async () => {
    const settings: AppSettings = {
      language: "zh",
      extra_scan_paths: ["C:\\skills"],
      auto_watch_enabled: true,
    };
    invokeMock.mockResolvedValue(settings);

    await expect(updateAppSettings(settings)).resolves.toEqual(settings);
    expect(invokeMock).toHaveBeenCalledWith("update_app_settings", { settings });
  });

  it("clears app data through the dedicated command", async () => {
    invokeMock.mockResolvedValue(undefined);

    await expect(clearAppData()).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith("clear_app_data");
  });
});
