import { invoke } from "@tauri-apps/api/core";
import type { Skill, GraphData } from "@/types";

export async function getSkills(): Promise<Skill[]> {
  return invoke<Skill[]>("get_skills");
}

export async function getSkill(id: string): Promise<Skill> {
  return invoke<Skill>("get_skill", { id });
}

export async function scanAndImport(): Promise<Skill[]> {
  return invoke<Skill[]>("scan_and_import");
}

export async function deleteSkill(id: string): Promise<void> {
  return invoke<void>("delete_skill", { id });
}

export async function getSkillContent(id: string): Promise<string> {
  return invoke<string>("get_skill_content", { id });
}

export async function saveSkillContent(id: string, content: string): Promise<void> {
  return invoke<void>("save_skill_content", { id, content });
}

export async function getGraph(): Promise<GraphData> {
  return invoke<GraphData>("get_graph");
}
