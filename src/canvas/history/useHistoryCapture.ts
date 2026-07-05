import { useAtomValue, useStore } from "jotai";
import { useEffect, useRef } from "react";
import { activeConnectionAtom } from "../../Connection/state";
import { sessionStateAtom } from "../../multiplayer/state";
import { documentAtom, loadEpochAtom, subscribeDocumentMutations } from "../state";
import type { PageState } from "../types";
import { captureCheckpoint, resetHistoryStore, type HistoryScope } from "./historyStore";
import { toPageSnapshot } from "./pageDelta";

// Checkpoints are coarse "versions", not undo steps (those live in
// useUndoHistory at 300ms) — capture after 30s idle, but never let a long
// editing streak go more than 3min without one.
const DEBOUNCE_MS = 30_000;
const MAX_WAIT_MS = 180_000;

export function useHistoryCapture() {
  const conn = useAtomValue(activeConnectionAtom);
  const session = useAtomValue(sessionStateAtom);
  const loadEpoch = useAtomValue(loadEpochAtom);
  const store = useStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reference-equality skip list: immutable updates mean an untouched page
  // keeps its identity, so unchanged pages cost nothing at flush time.
  const lastSeenPagesRef = useRef(new Map<string, PageState>());

  useEffect(() => {
    resetHistoryStore();
    lastSeenPagesRef.current = new Map();
  }, [loadEpoch]);

  useEffect(() => {
    if (!conn) {
      return;
    }
    // Joiner observes the host's replica — capturing it would write someone
    // else's board into the local history log (same guard as autosave).
    if (session?.role === "joiner") {
      return;
    }

    const scope: HistoryScope = {
      workspace: conn.workspaceName,
      connectionName: conn.connection.name,
    };

    const clearTimers = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (maxWaitRef.current) {
        clearTimeout(maxWaitRef.current);
        maxWaitRef.current = null;
      }
    };

    const flush = async () => {
      clearTimers();
      const doc = store.get(documentAtom);
      const seen = lastSeenPagesRef.current;
      for (const page of Object.values(doc.pages)) {
        if (seen.get(page.id) === page) {
          continue;
        }
        try {
          await captureCheckpoint({
            scope,
            pageId: page.id,
            snapshot: toPageSnapshot(page),
            takenAt: Date.now(),
          });
          seen.set(page.id, page);
        } catch (e) {
          console.error("Failed to capture history checkpoint:", e);
        }
      }
    };

    const unsubscribe = subscribeDocumentMutations((prev, next) => {
      // Capture the page the user is leaving right away — the debounce window
      // shouldn't ride across a context switch.
      if (prev.activePageId !== next.activePageId) {
        void flush();
        return;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => void flush(), DEBOUNCE_MS);
      if (!maxWaitRef.current) {
        maxWaitRef.current = setTimeout(() => void flush(), MAX_WAIT_MS);
      }
    });

    return () => {
      unsubscribe();
      clearTimers();
      // Don't lose an in-window edit on connection switch (mirrors autosave).
      void flush();
    };
  }, [conn, session, store]);
}
