import { stripEdge, stripNode } from "../stripEphemeral";
import type { PageState } from "../types";
import type { ChangeSummary, PageDelta, PageSnapshot } from "./types";

export function toPageSnapshot(page: PageState): PageSnapshot {
  return {
    name: page.name,
    nodes: page.nodes.map(n => stripNode(n)),
    edges: page.edges.map(e => stripEdge(e)),
    regions: page.regions ?? [],
  };
}

export function emptyPageSnapshot(name: string): PageSnapshot {
  return { name, nodes: [], edges: [], regions: [] };
}

export function pageSnapshotKey(snapshot: PageSnapshot): string {
  return JSON.stringify(snapshot);
}

function diffById<T extends { id: string }>(
  prev: T[],
  next: T[],
): { puts: T[]; delIds: string[]; added: number; edited: number } {
  const prevById = new Map(prev.map(item => [item.id, item]));
  const nextIds = new Set(next.map(item => item.id));
  const puts: T[] = [];
  let added = 0;
  let edited = 0;
  for (const item of next) {
    const previous = prevById.get(item.id);
    if (!previous) {
      puts.push(item);
      added += 1;
    } else if (JSON.stringify(previous) !== JSON.stringify(item)) {
      puts.push(item);
      edited += 1;
    }
  }
  const delIds = prev.filter(item => !nextIds.has(item.id)).map(item => item.id);
  return { puts, delIds, added, edited };
}

export function diffPage(
  prev: PageSnapshot,
  next: PageSnapshot,
): { delta: PageDelta; summary: ChangeSummary } {
  const nodes = diffById(prev.nodes, next.nodes);
  const edges = diffById(prev.edges, next.edges);
  const regions = diffById(prev.regions ?? [], next.regions ?? []);
  const renamed = prev.name !== next.name;
  return {
    delta: {
      putNodes: nodes.puts,
      delNodeIds: nodes.delIds,
      putEdges: edges.puts,
      delEdgeIds: edges.delIds,
      putRegions: regions.puts,
      delRegionIds: regions.delIds,
      ...(renamed ? { name: next.name } : {}),
    },
    summary: {
      addedNodes: nodes.added,
      editedNodes: nodes.edited,
      removedNodes: nodes.delIds.length,
      addedEdges: edges.added,
      editedEdges: edges.edited,
      removedEdges: edges.delIds.length,
      changedRegions: regions.added + regions.edited + regions.delIds.length,
      renamed,
    },
  };
}

export function applyDelta(snapshot: PageSnapshot, delta: PageDelta): PageSnapshot {
  const nodes = new Map(snapshot.nodes.map(n => [n.id, n]));
  for (const id of delta.delNodeIds) {
    nodes.delete(id);
  }
  for (const node of delta.putNodes) {
    nodes.set(node.id, node);
  }
  const edges = new Map(snapshot.edges.map(e => [e.id, e]));
  for (const id of delta.delEdgeIds) {
    edges.delete(id);
  }
  for (const edge of delta.putEdges) {
    edges.set(edge.id, edge);
  }
  const regions = new Map((snapshot.regions ?? []).map(r => [r.id, r]));
  for (const id of delta.delRegionIds ?? []) {
    regions.delete(id);
  }
  for (const region of delta.putRegions ?? []) {
    regions.set(region.id, region);
  }
  return {
    name: delta.name ?? snapshot.name,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    regions: [...regions.values()],
  };
}
