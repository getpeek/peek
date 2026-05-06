import { useMemo } from "react";
import type { AppEdge, AppNode, QueryData } from "../types";

export function useSelectionHighlight(nodes: AppNode[], edges: AppEdge[]) {
  return useMemo(() => {
    const selectedIds = new Set(nodes.filter(node => node.selected).map(node => node.id));
    const liveQueryIds = new Set(
      nodes
        .filter(
          node =>
            node.type === "query" && ((node.data as QueryData).liveIntervalMs ?? null) !== null,
        )
        .map(node => node.id),
    );
    if (selectedIds.size === 0 && liveQueryIds.size === 0) {
      return { styledNodes: nodes, styledEdges: edges };
    }
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      const sourceSelected = selectedIds.has(edge.source);
      const targetSelected = selectedIds.has(edge.target);
      if (sourceSelected && !targetSelected) {
        connectedIds.add(edge.target);
      }
      if (targetSelected && !sourceSelected) {
        connectedIds.add(edge.source);
      }
    }
    const styledEdges = edges.map(edge => {
      const existing = edge.className ?? "";
      const parts: string[] = existing ? [existing] : [];
      const connectionActive = selectedIds.has(edge.source) || selectedIds.has(edge.target);
      if (connectionActive && !existing.includes("connection-active")) {
        parts.push("connection-active");
      }
      if (liveQueryIds.has(edge.source) && !existing.includes("query-live")) {
        parts.push("query-live");
      }
      if (parts.length === (existing ? 1 : 0)) {
        return edge;
      }
      return { ...edge, className: parts.join(" ").trim() };
    });
    if (connectedIds.size === 0) {
      return { styledNodes: nodes, styledEdges };
    }
    const styledNodes = nodes.map(node => {
      if (!connectedIds.has(node.id)) {
        return node;
      }
      const existing = node.className ?? "";
      if (existing.split(" ").includes("connected")) {
        return node;
      }
      return { ...node, className: existing ? `${existing} connected` : "connected" };
    });
    return { styledNodes, styledEdges };
  }, [nodes, edges]);
}
