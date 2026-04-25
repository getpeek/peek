import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { activeConnectionAtom } from "../Connection/state";
import { documentAtom } from "./state";
import { emptyDocument } from "./emptyDocument";
import type { CanvasDocument } from "./types";

function isValidDocument(value: unknown): value is CanvasDocument {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.activePageId !== "string") return false;
  if (!Array.isArray(v.pageOrder)) return false;
  if (!v.pages || typeof v.pages !== "object") return false;
  return true;
}

export function useLoadDocument() {
  const conn = useAtomValue(activeConnectionAtom);
  const setDoc = useSetAtom(documentAtom);

  useEffect(() => {
    if (!conn) return;

    let cancelled = false;

    invoke<string>("load", {
      workspace: conn.workspaceName,
      connectionName: conn.connection.name,
    })
      .then((result) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(result);
          if (isValidDocument(parsed)) {
            setDoc(parsed);
            return;
          }
        } catch {
          // fall through to empty
        }
        setDoc(emptyDocument());
      })
      .catch(() => {
        if (!cancelled) setDoc(emptyDocument());
      });

    return () => {
      cancelled = true;
    };
  }, [conn, setDoc]);
}
