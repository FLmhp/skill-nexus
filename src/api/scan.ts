import { invoke } from "@tauri-apps/api/core";
import type { ScanResult } from "@/types";

export async function scanSkillSecurity(skillId: string): Promise<ScanResult> {
  return invoke<ScanResult>("scan_skill_security", { skillId });
}

export async function getScanResults(): Promise<ScanResult[]> {
  return invoke<ScanResult[]>("get_scan_results");
}

export async function scanAllSkills(): Promise<ScanResult[]> {
  return invoke<ScanResult[]>("scan_all_skills");
}
