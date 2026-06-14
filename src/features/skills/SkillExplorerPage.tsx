import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, Plus, Package, Grid3X3, List, Loader2, X } from "lucide-react"
import { useSkillsList, useCreateSkill, useImportSkill } from "../../hooks/useSkills"
import { SkillCard } from "../../components/shared/SkillCard"
import { cn } from "../../lib/cn"
import type { SkillFilters } from "../../services/ipc"

export function SkillExplorerPage() {
  const { t } = useTranslation()

  // State
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [skillType, setSkillType] = useState<string>("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Create form state
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newType, setNewType] = useState("custom")

  // Filters
  const filters: SkillFilters = {
    search: debouncedSearch || undefined,
    skill_type: skillType || undefined,
    page,
    limit: 24,
    sort_by: "updated_at",
    sort_dir: "DESC",
  }

  const { data, isLoading, isError } = useSkillsList(filters)
  const createMutation = useCreateSkill()
  const importMutation = useImportSkill()

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300))
  }

  const handleCreate = () => {
    if (!newName.trim() || !newContent.trim()) return
    createMutation.mutate({
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      content: newContent,
      type: newType,
      category: newCategory.trim() || undefined,
      tags: [],
      author: "",
    }, {
      onSuccess: () => {
        setShowCreate(false)
        setNewName(""); setNewDesc(""); setNewContent(""); setNewCategory("")
      }
    })
  }

  const handleImport = async () => {
    // Use Tauri dialog to pick a file
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const selected = await open({
        multiple: false,
        filters: [{ name: "Skills", extensions: ["md", "json", "yaml", "yml"] }],
      })
      if (selected) {
        importMutation.mutate(selected as string)
      }
    } catch {
      // Fallback: browser prompt
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".md,.json,.yaml,.yml"
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          importMutation.mutate((file as any).path ?? file.name)
        }
      }
      input.click()
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("nav.skills")}</h1>
          {data && (
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {data.total} skill{data.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <Download size={16} /> Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {t("skills.create_new")}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("skills.search_placeholder")}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>
        <select
          value={skillType}
          onChange={(e) => { setSkillType(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
        >
          <option value="">All Types</option>
          <option value="custom">Custom</option>
          <option value="marketplace">Marketplace</option>
          <option value="template">Template</option>
          <option value="system">System</option>
        </select>
        <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors",
              viewMode === "grid" ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]" : "text-[var(--text-tertiary)] hover:bg-[var(--surface-elevated)]")}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-colors",
              viewMode === "list" ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]" : "text-[var(--text-tertiary)] hover:bg-[var(--surface-elevated)]")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-red-500">Failed to load skills. Is the backend running?</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="h-16 w-16 text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)]">
            {search ? "No skills match your search" : t("skills.no_skills")}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {search ? "Try different keywords or clear the filter" : "Create your first skill to get started"}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> {t("skills.create_new")}
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.items.map((skill) => (
                <SkillCard key={skill.id} skill={skill} view="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {data.items.map((skill) => (
                <SkillCard key={skill.id} skill={skill} view="list" />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                Page {data.page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Skill Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create New Skill</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Name *</label>
                <input
                  type="text" value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., TypeScript Code Review"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1">
                    <option value="custom">Custom</option>
                    <option value="template">Template</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Category</label>
                  <input
                    type="text" value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., Code Review"
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Description</label>
                <input
                  type="text" value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of what this skill does"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Content (Markdown) *</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="# Skill Name&#10;&#10;## Instructions&#10;You are a helpful assistant that..."
                  rows={8}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm mt-1 font-mono focus:outline-none focus:border-[var(--brand-primary)] resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)}
                className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button onClick={handleCreate}
                disabled={!newName.trim() || !newContent.trim() || createMutation.isPending}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {createMutation.isPending ? "Creating..." : "Create Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Download icon inline
function Download({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
