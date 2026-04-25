import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { activeConnectionAtom } from "../Connection/state";
import { documentAtom } from "./state";

export function useAutoSaveDocument() {
  const doc = useAtomValue(documentAtom);
  const conn = useAtomValue(activeConnectionAtom);
  const hasObservedInitialRef = useRef(false);
  const lastSavedJsonRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conn) return;

    const json = JSON.stringify(doc);

    if (!hasObservedInitialRef.current) {
      hasObservedInitialRef.current = true;
      lastSavedJsonRef.current = json;
      return;
    }

    if (json === lastSavedJsonRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
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
    }, 3000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [doc, conn]);

  // Reset observation flag on connection change so the next load doesn't
  // get re-saved as a "user change".
  useEffect(() => {
    hasObservedInitialRef.current = false;
    lastSavedJsonRef.current = "";
  }, [conn?.workspaceName, conn?.connection.name]);
}
