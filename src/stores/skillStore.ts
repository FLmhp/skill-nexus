import { create } from "zustand";
import type { ScanImportSummary, Skill } from "@/types";
import * as skillsApi from "@/api/skills";
import { toUserError } from "@/lib/apiError";

interface SkillState {
  skills: Skill[];
  selectedSkill: Skill | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  lastScanSummary: ScanImportSummary | null;
  fetchSkills: () => Promise<void>;
  scanAndImport: () => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  setSelectedSkill: (skill: Skill | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  selectedSkill: null,
  loading: false,
  error: null,
  searchQuery: "",
  lastScanSummary: null,

  fetchSkills: async () => {
    set({ loading: true, error: null });
    try {
      const skills = await skillsApi.getSkills();
      set({ skills, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  scanAndImport: async () => {
    set({ loading: true, error: null });
    try {
      const result = await skillsApi.scanAndImport();
      set({ skills: result.skills, lastScanSummary: result.summary, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  deleteSkill: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await skillsApi.deleteSkill(id);
      const skills = get().skills.filter((s) => s.id !== id);
      const selectedSkill = get().selectedSkill?.id === id ? null : get().selectedSkill;
      set({ skills, selectedSkill, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
