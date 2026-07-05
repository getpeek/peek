import { invoke } from "@tauri-apps/api/core";
import { ids } from "../ids";
import { buildChains, compactChains, parseLog, serializeChains } from "./historyLog";
import type { PageChain } from "./historyLog";
import { applyDelta, diffPage, emptyPageSnapshot, pageSnapshotKey } from "./pageDelta";
import type { HistoryEntry, PageSnapshot } from "./types";

export type HistoryScope = { workspace: string; connectionName: string };

// A full snapshot every K entries bounds both replay cost and how many deltas
// a corrupt line can invalidate (bad lines drop the rest of their segment).
const FULL_EVERY = 20;
// A near-snapshot-sized delta ("select all, delete, rebuild") stores worse
// than the snapshot itself.
const DELTA_SIZE_RATIO = 0.6;

type ConnectionHistory = {
  chains: Map<string, PageChain>;
  writeQueue: Promise<unknown>;
};

const loadingLogs = new Map<string, Promise<ConnectionHistory>>();
const loadedLogs = new Map<string, ConnectionHistory>();

export type HistoryChangeListener = (scope: HistoryScope) => void;

const changeListeners = new Set<HistoryChangeListener>();

export function subscribeHistoryChanges(fn: HistoryChangeListener): () => void {
  changeListeners.add(fn);
  return () => {
    changeListeners.delete(fn);
  };
}

function notify(scope: HistoryScope): void {
  for (const fn of changeListeners) {
    try {
      fn(scope);
    } catch (e) {
      console.error("historyChangeListener error:", e);
    }
  }
}

function scopeKey(scope: HistoryScope): string {
  return `${scope.workspace.toLowerCase()}/${scope.connectionName.toLowerCase()}`;
}

async function load(scope: HistoryScope): Promise<ConnectionHistory> {
  const contents = await invoke<string>("load_history", {
    workspace: scope.workspace,
    connectionName: scope.connectionName,
  }).catch(() => "");
  const chains = buildChains(parseLog(contents));
  if (compactChains(chains)) {
    await invoke("save_history", {
      workspace: scope.workspace,
      connectionName: scope.connectionName,
      contents: serializeChains(chains),
    }).catch((e: unknown) => console.error("Failed to compact history:", e));
  }
  return { chains, writeQueue: Promise.resolve() };
}

function ensureCache(scope: HistoryScope): Promise<ConnectionHistory> {
  const key = scopeKey(scope);
  const existing = loadingLogs.get(key);
  if (existing) {
    return existing;
  }
  const promise = load(scope).then(cache => {
    loadedLogs.set(key, cache);
    return cache;
  });
  loadingLogs.set(key, promise);
  return promise;
}

export async function ensureHistoryLoaded(scope: HistoryScope): Promise<void> {
  await ensureCache(scope);
  notify(scope);
}

/** Verified entries for one page, oldest first. Empty until loaded. */
export function getPageEntries(scope: HistoryScope, pageId: string): HistoryEntry[] {
  // Copied so later appends can't mutate an array a caller is holding on to.
  return [...(loadedLogs.get(scopeKey(scope))?.chains.get(pageId)?.entries ?? [])];
}

/** Rebuild the page state at a given entry: nearest full at-or-before it, then replay deltas. */
export function reconstructSnapshot(
  scope: HistoryScope,
  pageId: string,
  entryId: string,
): PageSnapshot | null {
  const chain = loadedLogs.get(scopeKey(scope))?.chains.get(pageId);
  const index = chain?.entries.findIndex(e => e.id === entryId) ?? -1;
  if (!chain || index === -1) {
    return null;
  }
  let fullIndex = index;
  while (chain.entries[fullIndex].kind !== "full") {
    fullIndex -= 1;
  }
  const full = chain.entries[fullIndex];
  let snapshot = full.kind === "full" ? full.snapshot : emptyPageSnapshot("");
  for (let i = fullIndex + 1; i <= index; i++) {
    const entry = chain.entries[i];
    if (entry.kind === "delta") {
      snapshot = applyDelta(snapshot, entry.delta);
    }
  }
  return snapshot;
}

/**
 * Append a checkpoint for a page unless its content matches the chain tail.
 * Loads the log lazily on first use; diffs against the reconstructed tail
 * from disk (not the autosaved document) so the chain self-heals after a
 * crash. Returns the new entry, or null when nothing changed.
 */
export async function captureCheckpoint(options: {
  scope: HistoryScope;
  pageId: string;
  snapshot: PageSnapshot;
  takenAt: number;
  label?: string;
}): Promise<HistoryEntry | null> {
  const cache = await ensureCache(options.scope);
  const run = cache.writeQueue.then(() => appendIfChanged(cache, options));
  cache.writeQueue = run.catch(() => null);
  return run;
}

async function appendIfChanged(
  cache: ConnectionHistory,
  options: {
    scope: HistoryScope;
    pageId: string;
    snapshot: PageSnapshot;
    takenAt: number;
    label?: string;
  },
): Promise<HistoryEntry | null> {
  const { scope, pageId, snapshot, takenAt, label } = options;
  const chain = cache.chains.get(pageId);
  const key = pageSnapshotKey(snapshot);
  if (chain && chain.tailKey === key) {
    return null;
  }

  const { delta, summary } = diffPage(chain?.tail ?? emptyPageSnapshot(snapshot.name), snapshot);
  const parent = chain?.entries.at(-1) ?? null;
  const asFull =
    !chain ||
    chain.sinceFull + 1 >= FULL_EVERY ||
    JSON.stringify(delta).length > key.length * DELTA_SIZE_RATIO;

  const base = {
    id: ids.checkpoint(),
    parentId: parent?.id ?? null,
    pageId,
    seq: (parent?.seq ?? 0) + 1,
    takenAt,
    ...(label ? { label } : {}),
    summary,
  };
  const entry: HistoryEntry = asFull
    ? { ...base, kind: "full", snapshot }
    : { ...base, kind: "delta", delta };

  await invoke("append_history", {
    workspace: scope.workspace,
    connectionName: scope.connectionName,
    line: JSON.stringify(entry),
  });

  if (chain) {
    chain.entries.push(entry);
    chain.tail = snapshot;
    chain.tailKey = key;
    chain.sinceFull = asFull ? 0 : chain.sinceFull + 1;
  } else {
    cache.chains.set(pageId, { entries: [entry], tail: snapshot, tailKey: key, sinceFull: 0 });
  }
  notify(scope);
  return entry;
}

/** Drop all cached logs — call when the document is reloaded or the connection changes. */
export function resetHistoryStore(): void {
  loadingLogs.clear();
  loadedLogs.clear();
}
