const legendItems = [
  {
    label: "Skill",
    color: "bg-blue-500",
    border: "border-blue-700",
    type: "node",
  },
  {
    label: "Agent",
    color: "bg-green-500",
    border: "border-green-700",
    type: "node",
  },
  {
    label: "Tag",
    color: "bg-purple-500",
    border: "border-purple-700",
    type: "node",
  },
  {
    label: "References",
    color: "bg-blue-500",
    type: "edge",
    lineStyle: "solid",
  },
  {
    label: "Depends",
    color: "bg-amber-500",
    type: "edge",
    lineStyle: "dashed",
  },
  {
    label: "Extends",
    color: "bg-green-500",
    type: "edge",
    lineStyle: "solid",
  },
];

export default function GraphLegend() {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h4 className="text-xs font-semibold text-foreground mb-2">Legend</h4>
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {item.type === "node" ? (
              <div
                className={`h-3.5 w-3.5 rounded ${item.color} border ${item.border}`}
              />
            ) : (
              <div className="flex items-center gap-0.5">
                <div className={`h-0.5 w-6 rounded ${item.lineStyle === "dashed" ? "border-t-2 border-dashed" : ""} ${item.color}`} />
                <div className={`w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] ${item.color === "bg-blue-500" ? "border-l-blue-500" : item.color === "bg-amber-500" ? "border-l-amber-500" : "border-l-green-500"}`} />
              </div>
            )}
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
