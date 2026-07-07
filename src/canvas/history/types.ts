import type { AppEdge, AppNode, RegionState } from "../types";

// The optional region fields stay optional for backward compatibility: history
// entries persist to disk, and pre-region snapshots/deltas/summaries load without them.
export type PageSnapshot = {
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  regions?: RegionState[];
};

export type PageDelta = {
  putNodes: AppNode[];
  delNodeIds: string[];
  putEdges: AppEdge[];
  delEdgeIds: string[];
  putRegions?: RegionState[];
  delRegionIds?: string[];
  name?: string;
};

export type ChangeSummary = {
  addedNodes: number;
  editedNodes: number;
  removedNodes: number;
  addedEdges: number;
  editedEdges: number;
  removedEdges: number;
  changedRegions?: number;
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
