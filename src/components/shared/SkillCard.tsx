import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Package, MoreVertical, Copy, Trash2, Download, Eye } from "lucide-react"
import type { SkillDTO } from "../../services/ipc"
import { cn } from "../../lib/cn"
import { useDeleteSkill, useDuplicateSkill } from "../../hooks/useSkills"
import { useState, useRef, useEffect } from "react"

interface SkillCardProps {
  skill: SkillDTO
  view?: "grid" | "list"
}

export function SkillCard({ skill, view = "grid" }: SkillCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const deleteMutation = useDeleteSkill()
  const duplicateMutation = useDuplicateSkill()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const tags: string[] = (() => {
    try {
      return JSON.parse(skill.tags)
    } catch {
      return []
    }
  })()

  const typeColors: Record<string, string> = {
    custom: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    system: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    marketplace: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    template: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  }

  if (view === "list") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
           onClick={() => navigate(`/skills/${skill.id}`)}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)]">
          <Package className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{skill.name}</p>
            <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", typeColors[skill.type] ?? typeColors.custom)}>
              {skill.type}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
            {skill.description || "No description"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span>v{skill.version}</span>
          <span>{new Date(skill.updated_at).toLocaleDateString()}</span>
        </div>
        <ContextMenu
          skillId={skill.id}
          skillName={skill.name}
          open={menuOpen}
          onToggle={() => setMenuOpen(!menuOpen)}
          onDelete={() => deleteMutation.mutate(skill.id)}
          onDuplicate={() => duplicateMutation.mutate({ id: skill.id })}
          menuRef={menuRef}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)] cursor-pointer"
          onClick={() => navigate(`/skills/${skill.id}`)}
        >
          <Package className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="rounded p-1 hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-lg py-1">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-background)]"
                onClick={() => { navigate(`/skills/${skill.id}`); setMenuOpen(false) }}
              >
                <Eye className="h-4 w-4" /> View
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-background)]"
                onClick={() => { duplicateMutation.mutate({ id: skill.id }); setMenuOpen(false) }}
              >
                <Copy className="h-4 w-4" /> Duplicate
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-background)]"
                onClick={() => { navigate(`/editor/${skill.id}`); setMenuOpen(false) }}
              >
                <Download className="h-4 w-4" /> Edit
              </button>
              <hr className="my-1 border-[var(--border-default)]" />
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => { deleteMutation.mutate(skill.id); setMenuOpen(false) }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1.5 cursor-pointer" onClick={() => navigate(`/skills/${skill.id}`)}>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-[var(--text-primary)] truncate">{skill.name}</h3>
          <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", typeColors[skill.type] ?? typeColors.custom)}>
            {skill.type}
          </span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">
          {skill.description || "No description"}
        </p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-xs bg-[var(--surface-background)] text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-xs text-[var(--text-tertiary)]">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-default)]">
        <span className="text-xs text-[var(--text-tertiary)]">v{skill.version}</span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {new Date(skill.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

// Small context menu for list view
function ContextMenu({
  skillId, skillName, open, onToggle, onDelete, onDuplicate, menuRef
}: {
  skillId: string; skillName: string; open: boolean;
  onToggle: () => void; onDelete: () => void; onDuplicate: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const navigate = useNavigate()
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="rounded p-1 hover:bg-[var(--surface-elevated)]"
      >
        <MoreVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-lg py-1">
          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-background)]"
                  onClick={() => { navigate(`/skills/${skillId}`); onToggle() }}>
            <Eye className="h-4 w-4" /> View
          </button>
          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-background)]"
                  onClick={() => { onDuplicate(); onToggle() }}>
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-background)]"
                  onClick={() => { navigate(`/editor/${skillId}`); onToggle() }}>
            <Download className="h-4 w-4" /> Edit
          </button>
          <hr className="my-1 border-[var(--border-default)]" />
          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => { onDelete(); onToggle() }}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
