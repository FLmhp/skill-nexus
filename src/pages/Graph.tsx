import { useEffect, useState, useCallback, useRef } from "react";
import { useGraphStore } from "@/stores/graphStore";
import SkillGraph from "@/components/graph/SkillGraph";
import GraphControls from "@/components/graph/GraphControls";
import GraphLegend from "@/components/graph/GraphLegend";
import type { Core } from "cytoscape";
import { Loader2, GitGraph } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Graph() {
  const { graphData, loading, layout, fetchGraph, setLayout } = useGraphStore();
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterRelationType, setFilterRelationType] = useState("");
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const handleCyReady = useCallback((cy: Core) => {
    cyRef.current = cy;

    cy.on("zoom", () => {
      setZoom(cy.zoom());
    });
  }, []);

  const handleNodeSelect = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom * 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom / 1.3);
    }
  }, []);

  const handleFit = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  }, []);

  const handleLayoutChange = useCallback(
    (newLayout: string) => {
      setLayout(newLayout as "cose" | "breadthfirst" | "circle" | "grid");
    },
    [setLayout]
  );

  const handleFilterChange = useCallback((type: string) => {
    setFilterRelationType(type);
    if (!cyRef.current) return;

    const cy = cyRef.current;
    if (type === "") {
      cy.elements().style("display", "element");
    } else {
      cy.edges().style("display", "none");
      cy.edges(`[type="${type}"]`).style("display", "element");
      cy.edges(`[type="${type}"]`).connectedNodes().style("display", "element");
    }
  }, []);

  const handleExportPng = useCallback(() => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, bg: "#0f172a", scale: 2 });
    const link = document.createElement("a");
    link.download = "skill-nexus-graph.png";
    link.href = png;
    link.click();
  }, []);

  const selectedNode = selectedNodeId
    ? graphData?.nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Knowledge Graph</h2>
          <p className="text-sm text-muted-foreground">
            Visualizing {graphData?.nodes.length ?? 0} nodes and {graphData?.edges.length ?? 0}{" "}
            edges
          </p>
        </div>
      </div>

      <GraphControls
        zoom={zoom}
        layout={layout}
        filterRelationType={filterRelationType}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        onLayoutChange={handleLayoutChange}
        onFilterChange={handleFilterChange}
        onExportPng={handleExportPng}
      />

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-full rounded-lg border border-border bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full rounded-lg border border-border bg-card text-muted-foreground">
              <GitGraph className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No graph data available</p>
              <p className="text-xs mt-1">Scan skills to build the knowledge graph</p>
            </div>
          ) : (
            <SkillGraph
              data={graphData}
              layout={layout}
              onCyReady={handleCyReady}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>

        <div className="w-56 shrink-0 space-y-4">
          <GraphLegend />

          {selectedNode && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Node Detail</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm text-foreground">{selectedNode.label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      selectedNode.node_type === "skill"
                        ? "bg-blue-500/10 text-blue-400"
                        : selectedNode.node_type === "agent"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-purple-500/10 text-purple-400"
                    )}
                  >
                    {selectedNode.node_type}
                  </span>
                </div>
                {selectedNode.group && (
                  <div>
                    <p className="text-xs text-muted-foreground">Group</p>
                    <p className="text-sm text-foreground">{selectedNode.group}</p>
                  </div>
                )}
                {Object.entries(selectedNode.data).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Data</p>
                    {Object.entries(selectedNode.data).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="text-foreground truncate">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedNode && graphData && graphData.nodes.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Click a node to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
