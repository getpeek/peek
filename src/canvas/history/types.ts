import type { AppEdge, AppNode } from "../types";

export type PageSnapshot = {
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
};

export type PageDelta = {
  putNodes: AppNode[];
  delNodeIds: string[];
  putEdges: AppEdge[];
  delEdgeIds: string[];
  name?: string;
};

export type ChangeSummary = {
  addedNodes: number;
  editedNodes: number;
  removedNodes: number;
  addedEdges: number;
  editedEdges: number;
  removedEdges: number;
  renamed: boolean;
};

type HistoryEntryBase = {
  id: string;
  // Previous entry for the same page; null starts a chain. Mirrors a git
  // parent commit — replay only trusts entries whose chain links verify.
  parentId: string | null;
  pageId: string;
  // 1-based per-page version number, persisted so "Version N" stays stable
  // across pruning.
  seq: number;
  takenAt: number;
  label?: string;
  summary: ChangeSummary;
};

export type HistoryEntry = HistoryEntryBase &
  ({ kind: "full"; snapshot: PageSnapshot } | { kind: "delta"; delta: PageDelta });
