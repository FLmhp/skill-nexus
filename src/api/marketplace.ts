import { invoke } from "@tauri-apps/api/core";
import type { MarketplaceSkill, Skill } from "@/types";

export async function searchMarketplace(query: string): Promise<MarketplaceSkill[]> {
  return invoke<MarketplaceSkill[]>("search_marketplace", { query });
}

export async function installFromUrl(url: string): Promise<Skill> {
  return invoke<Skill>("install_from_url", { url });
}
