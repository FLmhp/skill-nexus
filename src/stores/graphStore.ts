import { create } from "zustand";
import type { GraphData } from "@/types";
import * as skillsApi from "@/api/skills";
import { toUserError } from "@/lib/apiError";

type LayoutType = "cose" | "breadthfirst" | "circle" | "grid";

interface GraphState {
  graphData: GraphData | null;
  loading: boolean;
  error: string | null;
  selectedNode: string | null;
  layout: LayoutType;
  fetchGraph: () => Promise<void>;
  setSelectedNode: (id: string | null) => void;
  setLayout: (layout: LayoutType) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graphData: null,
  loading: false,
  error: null,
  selectedNode: null,
  layout: "cose",

  fetchGraph: async () => {
    set({ loading: true, error: null });
    try {
      const graphData = await skillsApi.getGraph();
      set({ graphData, loading: false });
    } catch (err) {
      set({ error: toUserError(err), loading: false });
    }
  },

  setSelectedNode: (id) => set({ selectedNode: id }),
  setLayout: (layout) => set({ layout }),
}));
