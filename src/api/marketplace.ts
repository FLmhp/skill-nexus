import { invoke } from "@tauri-apps/api/core";
import type { MarketplaceSearchResponse, Skill } from "@/types";

export async function searchMarketplace(
  query: string,
  source = "all",
  page = 1,
  limit = 20
): Promise<MarketplaceSearchResponse> {
  return invoke<MarketplaceSearchResponse>("search_marketplace", { query, source, page, limit });
}

export async function installFromUrl(url: string): Promise<Skill> {
  return invoke<Skill>("install_from_url", { url });
}
