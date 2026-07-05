import { atom } from "jotai";
import type { HistoryEntry, PageSnapshot } from "./types";

export const historyPanelOpenAtom = atom(false);

export type HistoryPreview = {
  pageId: string;
  entryId: string;
  seq: number;
  takenAt: number;
  snapshot: PageSnapshot;
};

// Non-destructive scrub preview. Read at the ReactFlow render boundary only —
// it substitutes what the canvas *shows*, never what the document *is*, so
// autosave, undo and multiplayer stay untouched while scrubbing.
export const historyPreviewAtom = atom<HistoryPreview | null>(null);

// Verified checkpoints for the active page, oldest first. Refreshed by
// useHistoryPanel from the lazily-loaded on-disk log.
export const historyEntriesAtom = atom<HistoryEntry[]>([]);
