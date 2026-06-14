import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Blocks, GripVertical, Plus, Eye, Save, X, Play, Loader2
} from "lucide-react"
import { useCreateSkill } from "../../hooks/useSkills"
import { cn } from "../../lib/cn"

// ── Block Types ──
type BlockType = "prompt" | "context" | "condition" | "output" | "reference" | "example"

interface BuilderBlock {
  id: string
  type: BlockType
  content: string
  label: string
}

const BLOCK_TEMPLATES: Record<BlockType, { label: string; icon: string; defaultContent: string; color: string }> = {
  prompt: { label: "Prompt Block", icon: "P", defaultContent: "You are a helpful assistant that...", color: "#6366f1" },
  context: { label: "Context Block", icon: "C", defaultContent: "- Language: TypeScript\n- Framework: React", color: "#22c55e" },
  condition: { label: "Condition Block", icon: "?", defaultContent: "IF: the user asks about performance\nTHEN: suggest optimization strategies", color: "#f59e0b" },
  output: { label: "Output Format", icon: "O", defaultContent: "Respond with:\n- A clear explanation\n- Code examples in code blocks\n- References to docs when relevant", color: "#a855f7" },
  reference: { label: "Reference Block", icon: "R", defaultContent: "See also: [related skill name]", color: "#ec4899" },
  example: { label: "Example Block", icon: "E", defaultContent: "Example:\nUser: How do I optimize this React component?\nAssistant: Here are the key areas to check...", color: "#06b6d4" },
}

// ── Sortable Block ──
function SortableBlock({ block, onUpdate, onRemove }: {
  block: BuilderBlock
  onUpdate: (id: string, content: string) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const template = BLOCK_TEMPLATES[block.type]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-default)]" style={{ backgroundColor: template.color + "10" }}>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
        </button>
        <span className="text-xs font-semibold" style={{ color: template.color }}>{template.label}</span>
        <div className="flex-1" />
        <button onClick={() => onRemove(block.id)} className="rounded p-0.5 hover:bg-[var(--surface-elevated)]">
          <X className="h-3 w-3 text-[var(--text-tertiary)]" />
        </button>
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onUpdate(block.id, e.target.value)}
        className="w-full resize-y bg-transparent px-3 py-2 text-sm font-mono text-[var(--text-primary)] outline-none min-h-[60px]"
        rows={block.content.split("\n").length}
        placeholder={`Enter ${block.type} content...`}
      />
    </div>
  )
}

// ── Page ──
export function SkillBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createMutation = useCreateSkill()

  const [blocks, setBlocks] = useState<BuilderBlock[]>([])
  const [skillName, setSkillName] = useState("")
  const [skillDesc, setSkillDesc] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  let blockCounter = 0
  const addBlock = (type: BlockType) => {
    const template = BLOCK_TEMPLATES[type]
    const newBlock: BuilderBlock = {
      id: `${type}-${++blockCounter}-${Date.now()}`,
      type,
      content: template.defaultContent,
      label: template.label,
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)))
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    const newBlocks = [...blocks]
    const [moved] = newBlocks.splice(oldIndex, 1)
    newBlocks.splice(newIndex, 0, moved)
    setBlocks(newBlocks)
  }

  // Generate markdown from blocks
  const generateMarkdown = useCallback(() => {
    const sections: string[] = []
    sections.push(`# ${skillName || "Untitled Skill"}\n`)
    if (skillDesc) sections.push(`> ${skillDesc}\n`)

    for (const block of blocks) {
      switch (block.type) {
        case "prompt":
          sections.push(`## Instructions\n\n${block.content}\n`)
          break
        case "context":
          sections.push(`## Context\n\n${block.content}\n`)
          break
        case "condition":
          sections.push(`## Conditions\n\n${block.content}\n`)
          break
        case "output":
          sections.push(`## Output Format\n\n${block.content}\n`)
          break
        case "reference":
          sections.push(`## References\n\n${block.content}\n`)
          break
        case "example":
          sections.push(`## Examples\n\n${block.content}\n`)
          break
      }
    }
    return sections.join("\n")
  }, [blocks, skillName, skillDesc])

  const handleSave = () => {
    const content = generateMarkdown()
    if (!skillName.trim() || !content.trim()) return
    createMutation.mutate({
      name: skillName,
      description: skillDesc,
      content,
      type: "custom",
      tags: [],
    }, {
      onSuccess: (skill) => navigate(`/skills/${skill.id}`),
    })
  }

  return (
    <div className="flex h-full">
      {/* Block palette (left sidebar) */}
      <div className="w-56 border-r border-[var(--border-default)] bg-[var(--surface-panel)] p-3 space-y-2">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Blocks</h3>
        {(Object.entries(BLOCK_TEMPLATES) as [BlockType, typeof BLOCK_TEMPLATES[keyof typeof BLOCK_TEMPLATES]][]).map(([type, tmpl]) => (
          <button
            key={type}
            onClick={() => addBlock(type)}
            className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-default)] p-2 text-left text-xs hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
                 style={{ backgroundColor: tmpl.color }}>
              {tmpl.icon}
            </div>
            <span className="text-[var(--text-primary)]">{tmpl.label}</span>
          </button>
        ))}
      </div>

      {/* Builder canvas (center) */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="Skill Name"
                className="text-lg font-bold bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] w-full"
              />
              <input
                type="text"
                value={skillDesc}
                onChange={(e) => setSkillDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="text-sm bg-transparent border-none outline-none text-[var(--text-tertiary)] placeholder:text-[var(--text-tertiary)] w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                  showPreview ? "border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]")}
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || !skillName.trim() || blocks.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Skill
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Blocks className="h-12 w-12 text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Drag blocks from the palette or click to add them</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Build your skill visually, then save to generate the prompt</p>
              <button onClick={() => addBlock("prompt")}
                className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Add Prompt Block
              </button>
            </div>
          ) : showPreview ? (
            <div className="max-w-3xl mx-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--text-primary)] bg-[var(--surface-background)] rounded-lg border border-[var(--border-default)] p-6">
                {generateMarkdown()}
              </pre>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="max-w-2xl mx-auto space-y-3">
                  {blocks.map((block) => (
                    <SortableBlock key={block.id} block={block} onUpdate={updateBlock} onRemove={removeBlock} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  )
}
