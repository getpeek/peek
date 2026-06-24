import { useAtomValue, useStore } from "jotai";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { activeConnectionAtom } from "../../Connection/state";
import { sessionStateAtom } from "../../multiplayer/state";
import { documentAtom, subscribeDocumentMutations } from "../state";

export function useAutoSaveDocument() {
  const conn = useAtomValue(activeConnectionAtom);
  const session = useAtomValue(sessionStateAtom);
  const store = useStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJsonRef = useRef<string>("");

  useEffect(() => {
    if (!conn) {
      return;
    }
    // Joiner observes the host's replica; their local doc shouldn't overwrite
    // their own on-disk state. session.end restores from snapshot.
    if (session?.role === "joiner") {
      return;
    }

    // The current document is already on disk (just loaded or last saved).
    lastSavedJsonRef.current = JSON.stringify(store.get(documentAtom));

    const flush = async () => {
      debounceRef.current = null;
      const json = JSON.stringify(store.get(documentAtom));
      if (json === lastSavedJsonRef.current) {
        return;
      }
      try {
        await invoke("save", {
          workspace: conn.workspaceName,
          connectionName: conn.connection.name,
          contents: json,
        });
        lastSavedJsonRef.current = json;
      } catch (e) {
        console.error("Failed to save canvas:", e);
      }
    };

    // React to document mutations through the out-of-band listener rather than
    // `useAtomValue(documentAtom)`. Subscribing in React would re-render this
    // hook's host — the top-level <App> — on every mutation, i.e. every frame
    // while a node is dragged (each frame rewrites the document). The listener
    // just (re)arms the debounce; the actual serialize happens once per window.
    const unsubscribe = subscribeDocumentMutations(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => void flush(), 3000);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // Flush any pending edit before teardown (e.g. on connection switch) so a
      // change made inside the debounce window isn't lost.
      void flush();
    };
  }, [conn, session, store]);
}
