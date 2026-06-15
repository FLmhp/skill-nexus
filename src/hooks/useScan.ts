import { useState, useCallback } from "react";
import type { ScanResult } from "@/types";
import * as scanApi from "@/api/scan";
import { toUserError } from "@/lib/apiError";

export function useScan() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scanApi.scanAllSkills();
      setResults(data);
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const scanSingle = useCallback(async (skillId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await scanApi.scanSkillSecurity(skillId);
      setResults((prev) => {
        const idx = prev.findIndex((r) => r.skill_id === skillId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result;
          return next;
        }
        return [...prev, result];
      });
      return result;
    } catch (err) {
      setError(toUserError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scanApi.getScanResults();
      setResults(data);
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, scanAll, scanSingle, fetchResults };
}
