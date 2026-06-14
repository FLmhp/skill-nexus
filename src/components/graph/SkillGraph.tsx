import { useEffect, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";
import type { GraphData, GraphNode, GraphEdge } from "@/types";

interface SkillGraphProps {
  data: GraphData;
  layout: string;
  onCyReady?: (cy: Core) => void;
  onNodeSelect?: (id: string | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStylesheet(): any[] {
  return [
    {
      selector: "node",
      style: {
        "background-color": "#3b82f6",
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        color: "#f8fafc",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "11px",
        "text-wrap": "wrap",
        "text-max-width": "120px",
        "border-width": 2,
        "border-color": "#1e293b",
        width: 60,
        height: 60,
        shape: "round-rectangle",
      },
    },
    {
      selector: "node[type=\"skill\"]",
      style: {
        "background-color": "#3b82f6",
        "border-color": "#1d4ed8",
        width: 60,
        height: 60,
      },
    },
    {
      selector: "node[type=\"agent\"]",
      style: {
        "background-color": "#22c55e",
        "border-color": "#15803d",
        width: 70,
        height: 70,
      },
    },
    {
      selector: "node[type=\"tag\"]",
      style: {
        "background-color": "#a855f7",
        "border-color": "#7e22ce",
        width: 50,
        height: 50,
        shape: "ellipse",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-color": "#f8fafc",
        "border-width": 3,
        "border-opacity": 0.8,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#475569",
        "target-arrow-color": "#475569",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "arrow-scale": 1.2,
        label: "data(label)",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "9px",
        color: "#94a3b8",
        "text-rotation": "autorotate",
        "text-background-color": "#0f172a",
        "text-background-opacity": 0.7,
        "text-background-padding": "2px",
      },
    },
    {
      selector: "edge[type=\"references\"]",
      style: {
        "line-color": "#3b82f6",
        "target-arrow-color": "#3b82f6",
      },
    },
    {
      selector: "edge[type=\"depends\"]",
      style: {
        "line-color": "#f59e0b",
        "target-arrow-color": "#f59e0b",
        "line-style": "dashed",
      },
    },
    {
      selector: "edge[type=\"extends\"]",
      style: {
        "line-color": "#22c55e",
        "target-arrow-color": "#22c55e",
        width: 3,
      },
    },
  ];
}

export default function SkillGraph({ data, layout, onCyReady, onNodeSelect }: SkillGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = convertToElements(data);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: buildStylesheet(),
      layout: { name: "preset" },
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 3,
    });

    cyRef.current = cy;
    onCyReady?.(cy);

    applyLayout(cy, layout);

    if (onNodeSelect) {
      cy.on("tap", "node", (evt) => {
        onNodeSelect(evt.target.id());
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          onNodeSelect(null);
        }
      });
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, onCyReady, onNodeSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyLayout(cy, layout);
  }, [layout]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg border border-border bg-card"
      style={{ minHeight: 500 }}
    />
  );
}

function convertToElements(data: GraphData) {
  const nodes = data.nodes.map((n: GraphNode) => ({
    group: "nodes" as const,
    data: {
      id: n.id,
      label: n.label,
      type: n.node_type,
      ...n.data,
    },
  }));

  const edges = data.edges.map((e: GraphEdge) => ({
    group: "edges" as const,
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || e.relation_type,
      type: e.relation_type,
    },
  }));

  return [...nodes, ...edges];
}

function applyLayout(cy: Core, layoutName: string) {
  const layouts: Record<string, cytoscape.LayoutOptions> = {
    cose: {
      name: "cose",
      animate: true,
      animationDuration: 800,
      nodeRepulsion: () => 8000,
      idealEdgeLength: () => 120,
      gravity: 0.3,
    },
    breadthfirst: {
      name: "breadthfirst",
      animate: true,
      animationDuration: 600,
      directed: true,
      spacingFactor: 1.5,
    },
    circle: {
      name: "circle",
      animate: true,
      animationDuration: 600,
      spacingFactor: 1.3,
    },
    grid: {
      name: "grid",
      animate: true,
      animationDuration: 600,
      rows: undefined,
    },
  };

  const options = layouts[layoutName] ?? layouts.cose;
  cy.layout(options).run();
}

export { buildStylesheet };
