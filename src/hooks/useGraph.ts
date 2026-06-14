import { useCallback, useRef, useState } from "react";
import type cytoscape from "cytoscape";

export function useGraph() {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [zoom, setZoom] = useState(1);

  const setCy = useCallback((cy: cytoscape.Core | null) => {
    cyRef.current = cy;
  }, []);

  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom * 1.3);
      setZoom(cyRef.current.zoom());
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom / 1.3);
      setZoom(cyRef.current.zoom());
    }
  }, []);

  const handleFit = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
      setZoom(cyRef.current.zoom());
    }
  }, []);

  const handleNodeSelect = useCallback(
    (callback: (id: string | null) => void) => {
      if (!cyRef.current) return;

      cyRef.current.on("tap", "node", (evt) => {
        const node = evt.target;
        callback(node.id());
      });

      cyRef.current.on("tap", (evt) => {
        if (evt.target === cyRef.current) {
          callback(null);
        }
      });
    },
    []
  );

  return {
    cyRef,
    zoom,
    setCy,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    handleNodeSelect,
  };
}
