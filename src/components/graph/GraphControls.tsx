import { ZoomIn, ZoomOut, Maximize, Download, Filter } from "lucide-react";

interface GraphControlsProps {
  zoom: number;
  layout: string;
  filterRelationType: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onLayoutChange: (layout: string) => void;
  onFilterChange: (type: string) => void;
  onExportPng: () => void;
}

const layouts = [
  { value: "cose", label: "Force" },
  { value: "breadthfirst", label: "Tree" },
  { value: "circle", label: "Circle" },
  { value: "grid", label: "Grid" },
];

const relationTypes = [
  { value: "", label: "All Edges" },
  { value: "references", label: "References" },
  { value: "depends", label: "Depends" },
  { value: "extends", label: "Extends" },
];

export default function GraphControls({
  zoom,
  layout,
  filterRelationType,
  onZoomIn,
  onZoomOut,
  onFit,
  onLayoutChange,
  onFilterChange,
  onExportPng,
}: GraphControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomIn}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={onFit}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Fit to Screen"
        >
          <Maximize className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground ml-1 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-1">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {layouts.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <select
          value={filterRelationType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {relationTypes.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1" />

      <button
        onClick={onExportPng}
        className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Export PNG
      </button>
    </div>
  );
}
