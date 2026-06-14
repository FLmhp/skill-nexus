import { useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState,
  type Node, type Edge, MarkerType, Panel, BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import {
  Search, Loader2, AlertTriangle,
  GitGraph, Eye, Plus, X
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getFullDependencyGraph } from "../../services/ipc"
import type { GraphDTO } from "../../services/ipc"

// ── Dagre layout ──
function layoutGraph(dto: GraphDTO): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 200, marginx: 50, marginy: 50 })

  dto.nodes.forEach((n) => {
    g.setNode(n.id, { width: 180, height: 70 })
  })
  dto.edges.forEach((e) => {
    g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  const colorByType: Record<string, string> = {
    custom: "#6366f1",
    system: "#a855f7",
    marketplace: "#22c55e",
    template: "#f59e0b",
  }

  const nodes: Node[] = dto.nodes.map((n) => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      type: "skillNode",
      position: { x: pos?.x ?? 0, y: pos?.y ?? 0 },
      data: {
        label: n.name,
        category: n.category,
        skillType: n.type,
        version: n.version,
        color: colorByType[n.type] ?? "#6366f1",
      },
    }
  })

  const edgeTypeStyle: Record<string, { stroke: string; dash: string }> = {
    imports: { stroke: "#6366f1", dash: "5,5" },
    extends: { stroke: "#22c55e", dash: "none" },
    requires: { stroke: "#f59e0b", dash: "none" },
    conflicts: { stroke: "#ef4444", dash: "10,5" },
  }

  const edges: Edge[] = dto.edges.map((e, i) => {
    const style = edgeTypeStyle[e.type] ?? edgeTypeStyle.imports
    return {
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: e.type === "requires",
      style: {
        stroke: style.stroke,
        strokeWidth: e.type === "requires" ? 2 : 1.5,
        strokeDasharray: style.dash,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
      label: e.type,
      labelStyle: { fontSize: 9, fill: "#888" },
      labelBgStyle: { fill: "var(--surface-panel, #fff)" },
    }
  })

  return { nodes, edges }
}

// ── Skill Node Component ──
function SkillNodeComponent({ data }: { data: { label: string; color: string; skillType: string; version: number; category?: string } }) {
  return (
    <div
      className="rounded-lg border-2 bg-[var(--surface-panel)] px-3 py-2 shadow-sm min-w-[160px] cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderColor: data.color }}
    >
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{data.label}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: data.color + "20", color: data.color }}>
          {data.skillType}
        </span>
        {data.category && (
          <span className="text-[10px] text-[var(--text-tertiary)]">{data.category}</span>
        )}
        <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">v{data.version}</span>
      </div>
    </div>
  )
}

const nodeTypes = { skillNode: SkillNodeComponent }

// ── Page ──
export function DependencyGraphPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const { data: graph, isLoading, isError } = useQuery({
    queryKey: ["dependencies", "graph"],
    queryFn: getFullDependencyGraph,
    refetchInterval: 30_000,
  })

  const initialLayout = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return { nodes: [], edges: [] }
    return layoutGraph(graph)
  }, [graph])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges)

  // Re-layout when graph data changes
  useMemo(() => {
    setNodes(initialLayout.nodes)
    setEdges(initialLayout.edges)
  }, [initialLayout.nodes.length, initialLayout.edges.length])

  // Filter by search
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodes
    const term = searchTerm.toLowerCase()
    return nodes.map((n) => ({
      ...n,
      hidden: !(String(n.data?.label ?? "").toLowerCase().includes(term)),
    }))
  }, [nodes, searchTerm])

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (isError || !graph) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-sm text-[var(--text-secondary)]">Failed to load dependency graph</p>
      </div>
    )
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <GitGraph className="h-16 w-16 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">No skills to display</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          Create some skills and add dependencies between them
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border-default)" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(n): string => (n.data?.color as string) ?? "#6366f1"}
          style={{ backgroundColor: "var(--surface-panel)" }}
        />

        {/* Search panel */}
        <Panel position="top-left" className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skills..."
              className="w-48 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] pl-8 pr-3 py-1.5 text-xs shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-[var(--text-tertiary)]" />
              </button>
            )}
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="top-right" className="bg-[var(--surface-panel)] rounded-lg border border-[var(--border-default)] p-3 text-xs shadow-sm space-y-1.5">
          <p className="font-semibold text-[var(--text-secondary)]">Edge Types</p>
          {[
            { type: "imports", color: "#6366f1", dash: "5,5" },
            { type: "extends", color: "#22c55e", dash: "none" },
            { type: "requires", color: "#f59e0b", dash: "none" },
            { type: "conflicts", color: "#ef4444", dash: "10,5" },
          ].map((e) => (
            <div key={e.type} className="flex items-center gap-2">
              <svg width="30" height="12">
                <line x1="0" y1="6" x2="30" y2="6" stroke={e.color} strokeWidth="2" strokeDasharray={e.dash} />
              </svg>
              <span className="text-[var(--text-secondary)]">{e.type}</span>
            </div>
          ))}
        </Panel>

        {/* Selected node actions */}
        {selectedNode && (
          <Panel position="top-center" className="bg-[var(--surface-panel)] rounded-lg border border-[var(--border-default)] p-2 shadow-sm flex items-center gap-2">
            <button onClick={() => navigate(`/skills/${selectedNode}`)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--surface-elevated)]">
              <Eye className="h-3 w-3" /> View
            </button>
            <button onClick={() => navigate(`/editor/${selectedNode}`)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--surface-elevated)]">
              <Plus className="h-3 w-3" /> Edit
            </button>
            <button onClick={() => setSelectedNode(null)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--surface-elevated)]">
              <X className="h-3 w-3" /> Close
            </button>
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}
