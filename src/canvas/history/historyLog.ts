import { applyDelta, pageSnapshotKey } from "./pageDelta";
import type { HistoryEntry, PageSnapshot } from "./types";

const MAX_ENTRIES_PER_PAGE = 500;

export type PageChain = {
  entries: HistoryEntry[];
  tail: PageSnapshot;
  tailKey: string;
  sinceFull: number;
};

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  const baseOk =
    typeof entry.id === "string" &&
    (entry.parentId === null || typeof entry.parentId === "string") &&
    typeof entry.pageId === "string" &&
    typeof entry.seq === "number" &&
    typeof entry.takenAt === "number" &&
    typeof entry.summary === "object" &&
    entry.summary !== null;
  if (!baseOk) {
    return false;
  }
  if (entry.kind === "full") {
    return typeof entry.snapshot === "object" && entry.snapshot !== null;
  }
  return entry.kind === "delta" && typeof entry.delta === "object" && entry.delta !== null;
}

export function parseLog(contents: string): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const line of contents.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      if (isHistoryEntry(parsed)) {
        entries.push(parsed);
      }
    } catch {
      // A truncated or hand-mangled line invalidates itself, not the log —
      // chain verification below drops anything that depended on it.
    }
  }
  return entries;
}

// Rebuild per-page chains from the raw log, git-style: a delta is only
// trusted when its parentId matches the last verified entry; anything else is
// dropped until the next full snapshot starts a fresh verified segment.
export function buildChains(all: HistoryEntry[]): Map<string, PageChain> {
  const chains = new Map<string, PageChain>();
  for (const entry of all) {
    const chain = chains.get(entry.pageId);
    if (entry.kind === "full") {
      const tailKey = pageSnapshotKey(entry.snapshot);
      if (chain) {
        chain.entries.push(entry);
        chain.tail = entry.snapshot;
        chain.tailKey = tailKey;
        chain.sinceFull = 0;
      } else {
        chains.set(entry.pageId, {
          entries: [entry],
          tail: entry.snapshot,
          tailKey,
          sinceFull: 0,
        });
      }
      continue;
    }
    if (!chain || chain.entries.at(-1)?.id !== entry.parentId) {
      continue;
    }
    const tail = applyDelta(chain.tail, entry.delta);
    chain.entries.push(entry);
    chain.tail = tail;
    chain.tailKey = pageSnapshotKey(tail);
    chain.sinceFull += 1;
  }
  return chains;
}

// Cap each page's chain, cutting on a full-snapshot boundary so every kept
// delta still has its base.
export function compactChains(chains: Map<string, PageChain>): boolean {
  let trimmed = false;
  for (const chain of chains.values()) {
    if (chain.entries.length <= MAX_ENTRIES_PER_PAGE) {
      continue;
    }
    const cutoff = chain.entries.length - MAX_ENTRIES_PER_PAGE;
    const start = chain.entries.findIndex((e, i) => i >= cutoff && e.kind === "full");
    if (start <= 0) {
      continue;
    }
    chain.entries = chain.entries.slice(start);
    trimmed = true;
  }
  return trimmed;
}

export function serializeChains(chains: Map<string, PageChain>): string {
  const lines: string[] = [];
  for (const chain of chains.values()) {
    for (const entry of chain.entries) {
      lines.push(JSON.stringify(entry));
    }
  }
  return lines.length > 0 ? lines.join("\n") + "\n" : "";
}
