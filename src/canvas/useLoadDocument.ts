import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { activeConnectionAtom } from "../Connection/state";
import { preSessionSnapshotAtom, sessionStateAtom } from "../multiplayer/state";
import { documentAtom, loadEpochAtom, resultsAtom } from "./state";
import { emptyDocument } from "./emptyDocument";
import type { DatabaseResult } from "../state";
import type { AppNode, CanvasDocument } from "./types";

function isValidDocument(value: unknown): value is CanvasDocument {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.activePageId !== "string") return false;
  if (!Array.isArray(v.pageOrder)) return false;
  if (!v.pages || typeof v.pages !== "object") return false;
  return true;
}

// Files saved before result rows moved to resultsAtom carried `data.data` on
// result nodes. Lift any such rows into resultsAtom and strip the field so the
// next autosave cleans up the on-disk format.
function migrateAndHydrate(doc: CanvasDocument): {
  migrated: CanvasDocument;
  hydrated: Record<string, DatabaseResult>;
} {
  const hydrated: Record<string, DatabaseResult> = {};
  const pages = Object.fromEntries(
    Object.entries(doc.pages).map(([pid, page]) => [
      pid,
      {
        ...page,
        nodes: page.nodes.map((n) => {
          if (n.type !== "result") return n;
          const legacy = n.data as {
            data?: DatabaseResult;
            query?: string;
            columnWidths?: Record<string, number>;
          };
          if (legacy.data) hydrated[n.id] = legacy.data;
          return {
            ...n,
            data: {
              query: legacy.query ?? "",
              ...(legacy.columnWidths
                ? { columnWidths: legacy.columnWidths }
                : {}),
            },
          } as AppNode;
        }),
      },
    ]),
  );
  return { migrated: { ...doc, pages }, hydrated };
}

export function useLoadDocument() {
  const conn = useAtomValue(activeConnectionAtom);
  const session = useAtomValue(sessionStateAtom);
  const snapshot = useAtomValue(preSessionSnapshotAtom);
  const setDoc = useSetAtom(documentAtom);
  const setResults = useSetAtom(resultsAtom);
  const setLoadEpoch = useSetAtom(loadEpochAtom);

  useEffect(() => {
    if (!conn) return;
    // Joiner views the host's replica; reading from disk would clobber it.
    // session.end restores from snapshot, so loads only resume in standalone/host.
    if (session?.role === "joiner") return;
    // End-of-session handoff: while `preSessionSnapshotAtom` is non-null and
    // `sessionStateAtom` has been cleared, `controls.end()` is mid-restore and
    // is about to write the snapshot back into `documentAtom`. An async
    // disk-reload here would land *after* the snapshot write and clobber it.
    // Wait until the snapshot is cleared — which `end()` does last — before
    // re-loading from disk.
    if (!session && snapshot) return;

    let cancelled = false;

    Promise.all([
      invoke<string>("load", {
        workspace: conn.workspaceName,
        connectionName: conn.connection.name,
      }),
      invoke<string>("load_results", {
        workspace: conn.workspaceName,
        connectionName: conn.connection.name,
      }).catch(() => "{}"),
    ])
      .then(([docJson, resultsJson]) => {
        if (cancelled) return;

        let sidecar: Record<string, DatabaseResult> = {};
        try {
          const parsed = JSON.parse(resultsJson);
          if (parsed && typeof parsed === "object") {
            sidecar = parsed as Record<string, DatabaseResult>;
          }
        } catch {
          // ignore corrupt sidecar
        }

        try {
          const parsed = JSON.parse(docJson);
          if (isValidDocument(parsed)) {
            const { migrated, hydrated } = migrateAndHydrate(parsed);
            // Sidecar wins on conflict — it's the authoritative record after
            // Stage 0; legacy `data.data` only matters for the first load of
            // a pre-migration workspace.
            setResults({ ...hydrated, ...sidecar });
            setDoc(migrated);
            setLoadEpoch((n) => n + 1);
            return;
          }
        } catch {
          // fall through to empty
        }
        setResults(sidecar);
        setDoc(emptyDocument());
        setLoadEpoch((n) => n + 1);
      })
      .catch(() => {
        if (!cancelled) {
          setResults({});
          setDoc(emptyDocument());
          setLoadEpoch((n) => n + 1);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conn, session, snapshot, setDoc, setResults, setLoadEpoch]);
}
