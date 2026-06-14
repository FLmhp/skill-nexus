import { FolderKanban, Plus } from "lucide-react"

export function ProjectsPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
        <button className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />
          Scan Project
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-20">
        <FolderKanban className="h-16 w-16 text-[var(--text-tertiary)] mb-4" />
        <p className="text-sm text-[var(--text-tertiary)]">
          Project scanning and context detection coming in Phase 5
        </p>
      </div>
    </div>
  )
}
