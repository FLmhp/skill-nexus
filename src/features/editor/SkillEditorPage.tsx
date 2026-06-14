import { useState, useEffect, useCallback, Suspense, lazy } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Save, Eye, Code2, Loader2 } from "lucide-react"
import { useSkill, useUpdateSkill, useCreateSkill } from "../../hooks/useSkills"

// Lazy-load Monaco for code splitting
const MonacoEditor = lazy(() => import("./MonacoEditor"))

export function SkillEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const isNew = !id || id === "new"
  const { data: existingSkill, isLoading } = useSkill(isNew ? undefined : id)
  const updateMutation = useUpdateSkill()
  const createMutation = useCreateSkill()

  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [description, setDescription] = useState("")
  const [changelog, setChangelog] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Populate from existing skill
  useEffect(() => {
    if (existingSkill) {
      setName(existingSkill.name)
      setContent(existingSkill.content)
      setDescription(existingSkill.description)
    }
  }, [existingSkill])

  const handleSave = useCallback(async () => {
    if (!name.trim() || !content.trim()) return
    setIsSaving(true)
    try {
      if (isNew) {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          content,
          tags: [],
        })
      } else if (id) {
        await updateMutation.mutateAsync({
          id,
          input: {
            name: name.trim(),
            description: description.trim(),
            content,
            changelog: changelog.trim() || undefined,
          },
        })
      }
      navigate("/skills")
    } finally {
      setIsSaving(false)
    }
  }, [name, content, description, changelog, isNew, id, createMutation, updateMutation, navigate])

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded p-1.5 hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <div className="flex flex-col">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Skill name..."
              className="text-sm font-semibold bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="text-xs bg-transparent border-none outline-none text-[var(--text-tertiary)] placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              showPreview
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Changelog bar (edit mode only) */}
      {!isNew && (
        <div className="flex items-center gap-2 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-1.5">
          <span className="text-xs text-[var(--text-tertiary)]">Changelog:</span>
          <input
            type="text"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="What changed? (optional)"
            className="flex-1 text-xs bg-transparent border-none outline-none text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-auto p-6">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              <span className="ml-3 text-sm text-[var(--text-secondary)]">Loading editor...</span>
            </div>
          }>
            <MonacoEditor value={content} onChange={setContent} language="markdown" />
          </Suspense>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-1">
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <Code2 className="h-3 w-3" />
          <span>Markdown</span>
          {existingSkill && <span>v{existingSkill.version} → v{existingSkill.version + 1}</span>}
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">Cmd+S to save</span>
      </div>
    </div>
  )
}

// Simple markdown-to-HTML renderer (just for preview, handles basic formatting)
function renderMarkdown(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br>")
  html = "<p>" + html + "</p>"
  return html
}
