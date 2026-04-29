import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { documentAtom, historyAtom, loadEpochAtom, type HistorySnapshot } from "./state";
import type { AppEdge, AppNode } from "./types";

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 300;

function stripNode(n: AppNode): AppNode {
  const {
    selected: _s,
    dragging: _d,
    resizing: _r,
    ...rest
  } = n as AppNode & {
    selected?: boolean;
    dragging?: boolean;
    resizing?: boolean;
  };
  return rest as AppNode;
}

function stripEdge(e: AppEdge): AppEdge {
  const { selected: _s, ...rest } = e as AppEdge & { selected?: boolean };
  return rest as AppEdge;
}

function makeSnapshot(nodes: AppNode[], edges: AppEdge[]): HistorySnapshot {
  return {
    nodes: nodes.map((n) => stripNode(n)),
    edges: edges.map((e) => stripEdge(e)),
  };
}

function snapshotKey(s: HistorySnapshot): string {
  return JSON.stringify(s);
}

export function useUndoHistory() {
  const [doc, setDoc] = useAtom(documentAtom);
  const [history, setHistory] = useAtom(historyAtom);
  const loadEpoch = useAtomValue(loadEpochAtom);

  const pageId = doc.activePageId;
  const page = doc.pages[pageId];

  const isUndoRedoRef = useRef(false);
  const lastStableRef = useRef<{
    key: string;
    snapshot: HistorySnapshot;
    pageId: string;
  } | null>(null);

  useEffect(() => {
    lastStableRef.current = null;
    setHistory({});
  }, [loadEpoch, setHistory]);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      const snap = makeSnapshot(page.nodes, page.edges);
      lastStableRef.current = {
        key: snapshotKey(snap),
        snapshot: snap,
        pageId,
      };
      isUndoRedoRef.current = false;
      return;
    }

    const last = lastStableRef.current;

    if (last && last.pageId !== pageId) {
      const snap = makeSnapshot(page.nodes, page.edges);
      lastStableRef.current = {
        key: snapshotKey(snap),
        snapshot: snap,
        pageId,
      };
      return;
    }

    const timer = setTimeout(() => {
      const snap = makeSnapshot(page.nodes, page.edges);
      const key = snapshotKey(snap);

      if (!last) {
        lastStableRef.current = { key, snapshot: snap, pageId };
        return;
      }

      if (key === last.key) {
        return;
      }

      setHistory((prev) => {
        const pageHist = prev[pageId] ?? { past: [], future: [] };
        return {
          ...prev,
          [pageId]: {
            past: [...pageHist.past, last.snapshot].slice(-MAX_HISTORY),
            future: [],
          },
        };
      });
      lastStableRef.current = { key, snapshot: snap, pageId };
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [page.nodes, page.edges, pageId, setHistory]);

  const restore = useCallback(
    (snap: HistorySnapshot) => {
      isUndoRedoRef.current = true;
      setDoc((d) => ({
        ...d,
        pages: {
          ...d.pages,
          [pageId]: {
            ...d.pages[pageId],
            nodes: snap.nodes,
            edges: snap.edges,
          },
        },
      }));
    },
    [pageId, setDoc],
  );

  const undo = useCallback(() => {
    const pageHist = history[pageId];
    if (!pageHist || pageHist.past.length === 0) {
      return;
    }

    const previous = pageHist.past.at(-1);
    const currentSnap = makeSnapshot(page.nodes, page.edges);

    setHistory((prev) => {
      const ph = prev[pageId] ?? { past: [], future: [] };
      return {
        ...prev,
        [pageId]: {
          past: ph.past.slice(0, -1),
          future: [...ph.future, currentSnap],
        },
      };
    });
    restore(previous);
  }, [history, pageId, page.nodes, page.edges, setHistory, restore]);

  const redo = useCallback(() => {
    const pageHist = history[pageId];
    if (!pageHist || pageHist.future.length === 0) {
      return;
    }

    const next = pageHist.future.at(-1);
    const currentSnap = makeSnapshot(page.nodes, page.edges);

    setHistory((prev) => {
      const ph = prev[pageId] ?? { past: [], future: [] };
      return {
        ...prev,
        [pageId]: {
          past: [...ph.past, currentSnap],
          future: ph.future.slice(0, -1),
        },
      };
    });
    restore(next);
  }, [history, pageId, page.nodes, page.edges, setHistory, restore]);

  const canUndo = (history[pageId]?.past.length ?? 0) > 0;
  const canRedo = (history[pageId]?.future.length ?? 0) > 0;

  return { undo, redo, canUndo, canRedo };
}
