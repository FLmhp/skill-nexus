import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { searchMarketplace, installFromMarketplace, getMarketplaceCategories, refreshMarketplace } from "../../services/ipc"
import type { MarketplaceItemDTO } from "../../services/ipc"
import { useUIStore } from "../../stores/useUIStore"
import { Store, Search, Download, Star, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { cn } from "../../lib/cn"

export function MarketplacePage() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSource, setSelectedSource] = useState<string>("")
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const { data: categories = [] } = useQuery({
    queryKey: ["marketplace", "categories"],
    queryFn: getMarketplaceCategories,
  })

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["marketplace", "search", search, selectedCategory, selectedSource],
    queryFn: () => searchMarketplace(search || "", {
      category: selectedCategory || undefined,
      source: selectedSource || undefined,
      limit: 100,
    }),
    enabled: true,
  })

  const installMutation = useMutation({
    mutationFn: installFromMarketplace,
    onSuccess: (data) => {
      addToast({ type: "success", title: `Installed: ${(data as any).name}` })
      queryClient.invalidateQueries({ queryKey: ["skills"] })
    },
    onError: (e: Error) => addToast({ type: "error", title: "Install failed", message: e.message }),
  })

  const refreshMutation = useMutation({
    mutationFn: refreshMarketplace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] })
      addToast({ type: "info", title: "Marketplace refreshed" })
    },
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Marketplace</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Discover community skills from multiple sources
          </p>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm hover:bg-[var(--surface-elevated)]"
        >
          <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} /> Refresh
        </button>
      </div>

      <div className="flex gap-4">
        {/* Category sidebar */}
        <div className="w-48 flex-shrink-0 space-y-1">
          <button
            onClick={() => setSelectedCategory("")}
            className={cn("block w-full text-left px-3 py-1.5 rounded text-sm",
              !selectedCategory ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]")}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn("block w-full text-left px-3 py-1.5 rounded text-sm",
                selectedCategory === cat ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]")}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search marketplace..."
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] pl-10 pr-4 py-2 text-sm"
              />
            </div>
            <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm">
              <option value="">All Sources</option>
              <option value="github">GitHub</option>
              <option value="skills.sh">skills.sh</option>
              <option value="skillsmp.com">skillsmp.com</option>
              <option value="npmskills.sh">npmskills.sh</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Store className="h-16 w-16 text-[var(--text-tertiary)] mb-4" />
              <p className="text-sm text-[var(--text-secondary)]">
                {search ? "No results found" : "Search or browse categories to discover skills"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <MarketplaceCard
                  key={item.id}
                  item={item}
                  onInstall={() => installMutation.mutate(item.id)}
                  isInstalling={installMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MarketplaceCard({ item, onInstall, isInstalling }: {
  item: MarketplaceItemDTO; onInstall: () => void; isInstalling: boolean
}) {
  const sourceBadges: Record<string, string> = {
    github: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    "skills.sh": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    "skillsmp.com": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    "npmskills.sh": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.skill_name}</h3>
          <p className="text-xs text-[var(--text-tertiary)]">{item.author}</p>
        </div>
        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ml-2",
          sourceBadges[item.source] ?? sourceBadges.github)}>
          {item.source}
        </span>
      </div>

      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{item.description}</p>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-background)] text-[var(--text-tertiary)]">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {item.stars}</span>
          <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {item.downloads}</span>
        </div>
        <button
          onClick={onInstall}
          disabled={isInstalling}
          className="flex items-center gap-1 rounded bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> Install
        </button>
      </div>
    </div>
  )
}
