import { useMemo, useRef } from "react";
import type { AppEdge, AppNode, QueryData } from "../types";

type NodeCacheEntry = { source: AppNode; styled: AppNode };
type EdgeCacheEntry = { source: AppEdge; styled: AppEdge };

export function mergeClass(existing: string | undefined, extra: string): string {
  const base = existing ?? "";
  if (base.split(" ").includes(extra)) {
    return base;
  }
  return base ? `${base} ${extra}` : extra;
}

export function useSelectionHighlight(nodes: AppNode[], edges: AppEdge[]) {
  // React Flow re-renders a node/edge whenever its object *reference* changes.
  // The highlight classes here are a render-time decoration — they're never
  // written back to the atoms — so naively cloning every connected element hands
  // it a fresh object on each drag tick, re-rendering even a large, untouched
  // result table 60×/sec. These caches return the SAME styled object while the
  // source object and its target className are unchanged, keeping unaffected
  // elements referentially stable so React Flow can skip them.
  const nodeCache = useRef(new Map<string, NodeCacheEntry>());
  const edgeCache = useRef(new Map<string, EdgeCacheEntry>());

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
      let className = edge.className ?? "";
      if (selectedIds.has(edge.source) || selectedIds.has(edge.target)) {
        className = mergeClass(className, "connection-active");
      }
      if (liveQueryIds.has(edge.source)) {
        className = mergeClass(className, "query-live");
      }
      if (className === (edge.className ?? "")) {
        return edge;
      }
      const cached = edgeCache.current.get(edge.id);
      if (cached && cached.source === edge && cached.styled.className === className) {
        return cached.styled;
      }
      const styled = { ...edge, className };
      edgeCache.current.set(edge.id, { source: edge, styled });
      return styled;
    });

    if (connectedIds.size === 0) {
      return { styledNodes: nodes, styledEdges };
    }

    const styledNodes = nodes.map(node => {
      if (!connectedIds.has(node.id)) {
        return node;
      }
      const className = mergeClass(node.className, "connected");
      if (className === (node.className ?? "")) {
        return node;
      }
      const cached = nodeCache.current.get(node.id);
      if (cached && cached.source === node && cached.styled.className === className) {
        return cached.styled;
      }
      const styled = { ...node, className };
      nodeCache.current.set(node.id, { source: node, styled });
      return styled;
    });

    return { styledNodes, styledEdges };
  }, [nodes, edges]);
}
