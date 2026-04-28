import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { activeConnectionAtom } from "../Connection/state";
import { sessionStateAtom } from "../multiplayer/state";
import { resultsAtom } from "./state";

export function useAutoSaveResults() {
  const results = useAtomValue(resultsAtom);
  const conn = useAtomValue(activeConnectionAtom);
  const session = useAtomValue(sessionStateAtom);
  const hasObservedInitialRef = useRef(false);
  const lastSavedJsonRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conn) return;
    if (session?.role === "joiner") return;

    const json = JSON.stringify(results);

    if (!hasObservedInitialRef.current) {
      hasObservedInitialRef.current = true;
      lastSavedJsonRef.current = json;
      return;
    }

    if (json === lastSavedJsonRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await invoke("save_results", {
          workspace: conn.workspaceName,
          connectionName: conn.connection.name,
          contents: json,
        });
        lastSavedJsonRef.current = json;
      } catch (e) {
        console.error("Failed to save results:", e);
      }
    }, 3000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [results, conn, session]);

  useEffect(() => {
    hasObservedInitialRef.current = false;
    lastSavedJsonRef.current = "";
  }, [conn?.workspaceName, conn?.connection.name]);
}
