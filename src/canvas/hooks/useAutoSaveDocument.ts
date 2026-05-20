import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { activeConnectionAtom } from "../../Connection/state";
import { sessionStateAtom } from "../../multiplayer/state";
import { documentAtom } from "../state";

export function useAutoSaveDocument() {
  const doc = useAtomValue(documentAtom);
  const conn = useAtomValue(activeConnectionAtom);
  const session = useAtomValue(sessionStateAtom);
  const hasObservedInitialRef = useRef(false);
  const lastSavedJsonRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!conn) {
      return;
    }
    // Joiner observes the host's replica; their local doc shouldn't overwrite
    // their own on-disk state. session.end restores from snapshot.
    if (session?.role === "joiner") {
      return;
    }

    const json = JSON.stringify(doc);

    if (!hasObservedInitialRef.current) {
      hasObservedInitialRef.current = true;
      lastSavedJsonRef.current = json;
      return;
    }

    if (json === lastSavedJsonRef.current) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const flush = async () => {
      pendingSaveRef.current = null;
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
    pendingSaveRef.current = flush;
    debounceRef.current = setTimeout(() => {
      void flush();
    }, 3000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [doc, conn, session]);

  // On connection change, fire any in-flight debounced save against the
  // *previous* conn (the closure captured it) before resetting observation
  // state. Without this, viewport (and any other) edits made inside the
  // debounce window would be silently dropped on switch.
  useEffect(() => {
    return () => {
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        void pending();
      }
      hasObservedInitialRef.current = false;
      lastSavedJsonRef.current = "";
    };
  }, [conn?.workspaceName, conn?.connection.name]);
}
