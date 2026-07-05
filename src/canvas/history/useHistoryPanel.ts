import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useEffect, useState } from "react";
import { useHotkeys } from "@mantine/hooks";
import { activeConnectionAtom } from "../../Connection/state";
import { sessionStateAtom } from "../../multiplayer/state";
import { useCanvasApi } from "../hooks/useCanvas";
import { activePageIdAtom, documentAtom, loadEpochAtom, placeModeAtom } from "../state";
import {
  captureCheckpoint,
  ensureHistoryLoaded,
  getPageEntries,
  reconstructSnapshot,
  subscribeHistoryChanges,
  type HistoryScope,
} from "./historyStore";
import { toPageSnapshot } from "./pageDelta";
import { historyEntriesAtom, historyPanelOpenAtom, historyPreviewAtom } from "./state";

const TOAST_MS = 2400;

export function useHistoryPanel() {
  const [open, setOpen] = useAtom(historyPanelOpenAtom);
  const [entries, setEntries] = useAtom(historyEntriesAtom);
  const [preview, setPreview] = useAtom(historyPreviewAtom);
  const conn = useAtomValue(activeConnectionAtom);
  const session = useAtomValue(sessionStateAtom);
  const activePageId = useAtomValue(activePageIdAtom);
  const loadEpoch = useAtomValue(loadEpochAtom);
  const setDoc = useSetAtom(documentAtom);
  const setPlaceMode = useSetAtom(placeModeAtom);
  const canvas = useCanvasApi();
  const store = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const scope: HistoryScope | null = conn
    ? { workspace: conn.workspaceName, connectionName: conn.connection.name }
    : null;
  const presentId = entries.at(-1)?.id ?? null;

  // Opening (or switching page while open) lazily loads the log and captures
  // the current page, so the timeline always ends on a dot that IS "now".
  useEffect(() => {
    if (!open || !conn) {
      return;
    }
    const effectScope = { workspace: conn.workspaceName, connectionName: conn.connection.name };
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) {
        setEntries(getPageEntries(effectScope, activePageId));
      }
    };
    void (async () => {
      try {
        await ensureHistoryLoaded(effectScope);
        const page = store.get(documentAtom).pages[activePageId];
        if (page) {
          await captureCheckpoint({
            scope: effectScope,
            pageId: page.id,
            snapshot: toPageSnapshot(page),
            takenAt: Date.now(),
          });
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      }
      refresh();
      // Start with the present checkpoint selected so ←/→ steps through
      // versions right away.
      if (!cancelled) {
        setSelectedId(getPageEntries(effectScope, activePageId).at(-1)?.id ?? null);
      }
    })();
    const unsubscribe = subscribeHistoryChanges(() => refresh());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [open, conn, activePageId, setEntries, store]);

  // Selection and preview don't survive page switches or the panel closing.
  useEffect(() => {
    setSelectedId(null);
    setPreview(null);
  }, [open, activePageId, setPreview]);

  // A reload or connection switch invalidates everything on screen.
  useEffect(() => {
    setOpen(false);
  }, [loadEpoch, setOpen]);

  // Joiners view the host's replica; the local history log doesn't describe it.
  useEffect(() => {
    if (session?.role === "joiner") {
      setOpen(false);
    }
  }, [session, setOpen]);

  useEffect(() => {
    if (open) {
      document.body.dataset.historyOpen = "";
    } else {
      delete document.body.dataset.historyOpen;
    }
    return () => {
      delete document.body.dataset.historyOpen;
    };
  }, [open]);

  const previewing = preview !== null;
  useEffect(() => {
    if (previewing) {
      document.body.dataset.historyPreviewing = "";
    } else {
      delete document.body.dataset.historyPreviewing;
    }
    return () => {
      delete document.body.dataset.historyPreviewing;
    };
  }, [previewing]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fit the board whenever a checkpoint is selected so the previewed state is
  // fully in view. Runs after the commit that swapped the canvas to the
  // preview nodes, so React Flow fits the version being shown, not the one
  // being left.
  useEffect(() => {
    if (selectedId) {
      canvas?.fitView();
    }
  }, [selectedId, preview, canvas]);

  const select = (entryId: string) => {
    if (!scope) {
      return;
    }
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
      return;
    }
    setSelectedId(entryId);
    if (entryId === presentId) {
      setPreview(null);
      return;
    }
    const snapshot = reconstructSnapshot(scope, activePageId, entryId);
    if (!snapshot) {
      return;
    }
    // Nothing may mutate the real document underneath the preview — drop the
    // selection and any armed place tool before swapping what the canvas shows.
    canvas?.deselectAll();
    setPlaceMode(null);
    setPreview({
      pageId: activePageId,
      entryId,
      seq: entry.seq,
      takenAt: entry.takenAt,
      snapshot,
    });
  };

  const selectByOffset = (delta: number) => {
    if (!selectedId) {
      return;
    }
    const index = entries.findIndex(e => e.id === selectedId);
    const next = index === -1 ? undefined : entries[index + delta];
    if (next) {
      select(next.id);
    }
  };

  const closeCard = () => {
    setSelectedId(null);
    setPreview(null);
  };

  const closePanel = () => setOpen(false);

  const restore = async () => {
    if (!scope || !selectedId || selectedId === presentId) {
      return;
    }
    const entry = entries.find(e => e.id === selectedId);
    const snapshot = reconstructSnapshot(scope, activePageId, selectedId);
    if (!entry || !snapshot) {
      return;
    }

    const pageId = activePageId;
    const currentPage = store.get(documentAtom).pages[pageId];
    try {
      // Pending edits become their own checkpoint first — a restore commits
      // on top of history, it never erases the state it replaced.
      if (currentPage) {
        await captureCheckpoint({
          scope,
          pageId,
          snapshot: toPageSnapshot(currentPage),
          takenAt: Date.now(),
        });
      }
      setPreview(null);
      // A plain page write through documentAtom: undo capture, autosave and
      // the multiplayer diff all pick it up like any local edit.
      setDoc(d => ({
        ...d,
        pages: {
          ...d.pages,
          [pageId]: { ...d.pages[pageId], nodes: snapshot.nodes, edges: snapshot.edges },
        },
      }));
      const restored = await captureCheckpoint({
        scope,
        pageId,
        snapshot: { ...snapshot, name: currentPage?.name ?? snapshot.name },
        takenAt: Date.now(),
        label: `Restored Version ${entry.seq}`,
      });
      setSelectedId(restored?.id ?? null);
      setToast(`Restored Version ${entry.seq}`);
    } catch (e) {
      console.error("Failed to restore version:", e);
    }
  };

  useHotkeys([
    [
      "Escape",
      () => {
        if (!open) {
          return;
        }
        // Step back to the present first (keeps ←/→ navigation alive), then a
        // second Escape closes the panel.
        if (selectedId && selectedId !== presentId && presentId) {
          select(presentId);
        } else {
          closePanel();
        }
      },
    ],
    ["ArrowLeft", () => open && selectedId && selectByOffset(-1)],
    ["ArrowRight", () => open && selectedId && selectByOffset(1)],
    ["Enter", () => open && selectedId && void restore()],
  ]);

  return {
    open,
    entries,
    preview,
    selectedId,
    presentId,
    toast,
    select,
    selectByOffset,
    closeCard,
    closePanel,
    restore,
  };
}
