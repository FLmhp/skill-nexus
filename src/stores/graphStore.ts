import { create } from "zustand";
import type { GraphData } from "@/types";
import * as skillsApi from "@/api/skills";

type LayoutType = "cose" | "breadthfirst" | "circle" | "grid";

interface GraphState {
  graphData: GraphData | null;
  loading: boolean;
  selectedNode: string | null;
  layout: LayoutType;
  fetchGraph: () => Promise<void>;
  setSelectedNode: (id: string | null) => void;
  setLayout: (layout: LayoutType) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graphData: null,
  loading: false,
  selectedNode: null,
  layout: "cose",

  fetchGraph: async () => {
    set({ loading: true });
    try {
      const graphData = await skillsApi.getGraph();
      set({ graphData, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setSelectedNode: (id) => set({ selectedNode: id }),
  setLayout: (layout) => set({ layout }),
}));
