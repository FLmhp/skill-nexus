import { beforeEach, describe, expect, it, vi } from "vitest";
import * as skillsApi from "@/api/skills";
import { useSkillStore } from "./skillStore";
import type { Skill } from "@/types";

vi.mock("@/api/skills", () => ({
  getSkills: vi.fn(),
  scanAndImport: vi.fn(),
  deleteSkill: vi.fn(),
}));

const getSkillsMock = vi.mocked(skillsApi.getSkills);
const scanAndImportMock = vi.mocked(skillsApi.scanAndImport);

const skill: Skill = {
  id: "skill-1",
  name: "Test Skill",
  description: "A test skill",
  path: "C:\\skills\\test",
  source_type: "local",
  installed_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  file_count: 1,
};

describe("skill store", () => {
  beforeEach(() => {
    useSkillStore.setState({
      skills: [],
      selectedSkill: null,
      loading: false,
      error: null,
      searchQuery: "",
      lastScanSummary: null,
    });
    vi.clearAllMocks();
  });

  it("loads skills into state", async () => {
    getSkillsMock.mockResolvedValue([skill]);

    await useSkillStore.getState().fetchSkills();

    expect(useSkillStore.getState().skills).toEqual([skill]);
    expect(useSkillStore.getState().loading).toBe(false);
    expect(useSkillStore.getState().error).toBeNull();
  });

  it("stores fetch errors for the UI", async () => {
    getSkillsMock.mockRejectedValue(new Error("scan failed"));

    await useSkillStore.getState().fetchSkills();

    expect(useSkillStore.getState().skills).toEqual([]);
    expect(useSkillStore.getState().loading).toBe(false);
    expect(useSkillStore.getState().error).toContain("scan failed");
  });

  it("uses scan/import results returned by the backend", async () => {
    const summary = {
      scanned_paths: 2,
      discovered: 3,
      imported: 1,
      updated: 2,
      skipped: 0,
      errors: [],
      scanned_at: "2026-06-15T00:00:00Z",
    };
    scanAndImportMock.mockResolvedValue({ skills: [skill], summary });

    await useSkillStore.getState().scanAndImport();

    expect(useSkillStore.getState().skills).toEqual([skill]);
    expect(useSkillStore.getState().lastScanSummary).toEqual(summary);
  });
});
