import { useState } from "react";
import type { ScanResult, ScanFinding } from "@/types";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";

interface ScanResultCardProps {
  result: ScanResult;
}

function parseFindings(json: string): ScanFinding[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    safe: { color: "bg-green-500/10 text-green-400 border-green-500/20", icon: ShieldCheck },
    caution: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: ShieldAlert },
    warning: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: ShieldAlert },
    critical: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: ShieldX },
    danger: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: ShieldX },
  };

  const c = config[severity.toLowerCase()] ?? config.caution;
  const Icon = c.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        c.color
      )}
    >
      <Icon className="h-3 w-3" />
      {severity}
    </span>
  );
}

export default function ScanResultCard({ result }: ScanResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const findings = parseFindings(result.findings_json);

  const riskColor =
    result.risk_score < 3
      ? "text-green-400"
      : result.risk_score < 7
        ? "text-yellow-400"
        : "text-red-400";

  const riskBarColor =
    result.risk_score < 3
      ? "bg-green-500"
      : result.risk_score < 7
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="rounded-lg border border-border bg-card transition-all hover:border-primary/20">
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl bg-muted")}>
            <span className={cn("text-2xl font-bold", riskColor)}>{result.risk_score}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">{result.skill_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <SeverityBadge severity={result.risk_severity} />
              <span className="text-xs text-muted-foreground">
                {result.components_scanned} components scanned
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <div className="h-1.5 w-32 rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", riskBarColor)}
                style={{ width: `${result.risk_score * 10}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Risk Score</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Recommendation</h4>
            <p className="text-sm text-muted-foreground">{result.recommendation}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Scanned: {new Date(result.scanned_at).toLocaleString()}
          </div>

          {findings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Findings ({findings.length})
              </h4>
              <div className="space-y-3">
                {findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4",
                          finding.severity === "critical"
                            ? "text-red-400"
                            : finding.severity === "warning"
                              ? "text-yellow-400"
                              : "text-green-400"
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {finding.rule_id}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs font-medium",
                          finding.severity === "critical"
                            ? "bg-red-500/10 text-red-400"
                            : finding.severity === "warning"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-green-500/10 text-green-400"
                        )}
                      >
                        {finding.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(finding.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{finding.explanation}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Category: </span>
                        <span className="text-foreground">{finding.category}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pattern: </span>
                        <code className="text-foreground font-mono">{finding.pattern}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">File: </span>
                        <span className="text-foreground">{finding.file_path}</span>
                      </div>
                      {finding.line_number && (
                        <div>
                          <span className="text-muted-foreground">Line: </span>
                          <span className="text-foreground">{finding.line_number}</span>
                        </div>
                      )}
                    </div>
                    {finding.code_snippet && (
                      <pre className="mt-2 rounded bg-muted p-2 text-xs font-mono text-muted-foreground overflow-auto">
                        {finding.code_snippet}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {findings.length === 0 && (
            <p className="text-sm text-muted-foreground">No specific findings.</p>
          )}
        </div>
      )}
    </div>
  );
}
