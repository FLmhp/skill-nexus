import { useEffect } from "react";
import { useScan } from "@/hooks/useScan";
import { Shield, ScanSearch, Loader2, AlertCircle } from "lucide-react";
import ScanResultCard from "@/components/security/ScanResultCard";

export default function Security() {
  const { results, loading, error, scanAll, fetchResults } = useScan();

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Security Scan</h2>
          <p className="text-sm text-muted-foreground">
            {results.length} scan result{results.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={scanAll}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4" />
          )}
          Scan All Skills
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Shield className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">No scan results</p>
          <p className="text-xs mt-1">Click &quot;Scan All Skills&quot; to assess security</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <ScanResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
