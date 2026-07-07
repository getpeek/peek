import type { AppEdge, AppNode } from "../types";

// Two ungrouped nodes belong to the same cluster when they're connected by an
// edge or their centers sit within this many canvas pixels of each other.
const PROXIMITY_PX = 420;
const MIN_CLUSTER_SIZE = 2;
const FALLBACK_SIZE = 200;

const centerOf = (n: AppNode) => ({
  x: n.position.x + (n.measured?.width ?? n.width ?? FALLBACK_SIZE) / 2,
  y: n.position.y + (n.measured?.height ?? n.height ?? FALLBACK_SIZE) / 2,
});

/**
 * Geometric clustering of ungrouped nodes — union-find over edge connectivity
 * plus spatial proximity. No AI involved; the model only names the clusters
 * this produces. Draw strokes are decoration, not content, so they're skipped.
 */
export function clusterUngrouped(
  nodes: AppNode[],
  edges: AppEdge[],
  groupedIds: Set<string>,
): AppNode[][] {
  const candidates = nodes.filter(n => !groupedIds.has(n.id) && n.type !== "draw");
  if (candidates.length < MIN_CLUSTER_SIZE) {
    return [];
  }

  const parent = new Map(candidates.map(n => [n.id, n.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  for (const edge of edges) {
    if (parent.has(edge.source) && parent.has(edge.target)) {
      union(edge.source, edge.target);
    }
  }

  const centers = candidates.map(n => centerOf(n));
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y) < PROXIMITY_PX) {
        union(candidates[i].id, candidates[j].id);
      }
    }
  }

  const clusters = new Map<string, AppNode[]>();
  for (const node of candidates) {
    const root = find(node.id);
    clusters.set(root, [...(clusters.get(root) ?? []), node]);
  }

  return [...clusters.values()].filter(cluster => cluster.length >= MIN_CLUSTER_SIZE);
}
