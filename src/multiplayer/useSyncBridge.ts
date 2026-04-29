import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  documentAtom,
  isApplyingRemoteRef,
  resultsAtom,
  subscribeDocumentMutations,
  subscribeResultsMutations,
} from "../canvas/state";
import { applyOperation, applyResultOperation } from "./diffApply";
import { b64ToBytes, diffDocs, diffResults, keyKind, SCHEMA_INDEX_KEY } from "./diff";
import {
  preSessionSnapshotAtom,
  remoteCursorsAtom,
  sessionStateAtom,
  participantsAtom,
} from "./state";
import { schemaAtom } from "../state";
import {
  type DocUpdatePayload,
  type DocDeletePayload,
  handleExecRequest,
  isSchemaShape,
  pushOperation,
  pushSchemaToLspCache,
} from "./syncBridgeUtils";

export function useSyncBridge(): void {
  const session = useAtomValue(sessionStateAtom);
  const schema = useAtomValue(schemaAtom);
  const setDoc = useSetAtom(documentAtom);
  const setSession = useSetAtom(sessionStateAtom);
  const setRemoteCursors = useSetAtom(remoteCursorsAtom);
  const setSnapshot = useSetAtom(preSessionSnapshotAtom);
  const setResults = useSetAtom(resultsAtom);

  // Outbound (document): subscribe to local document mutations and push diffs.
  // Active for both `connecting` and `active` so the host's initial-state push
  // lands before sync-finished flips status.
  useEffect(() => {
    if (!session) {
      return;
    }
    return subscribeDocumentMutations((prev, next) => {
      const ops = diffDocs(prev, next);
      for (const op of ops) {
        pushOperation(op);
      }
    });
  }, [session]);

  // Outbound (results): per-result-node rows live in `results/<id>` entries.
  useEffect(() => {
    if (!session) {
      return;
    }
    return subscribeResultsMutations((prev, next) => {
      const ops = diffResults(prev, next);
      for (const op of ops) {
        pushOperation(op);
      }
    });
  }, [session]);

  // Outbound (schema): the host pushes its DB schema as a single
  // `schema/index` JSON blob so joiners — who have no DB connection — can
  // populate `schemaAtom` (canvas UI) and the Rust-side `SchemaCache` (LSP)
  // and get working completions/diagnostics. Re-runs on every schema
  // change so reconnecting to a different host-side DB also propagates.
  useEffect(() => {
    if (!session || session.role !== "host") {
      return;
    }
    pushOperation({
      kind: "put",
      key: SCHEMA_INDEX_KEY,
      value: new TextEncoder().encode(JSON.stringify(schema)),
    });
  }, [schema, session]);

  // Inbound: doc-update / doc-delete / sync-finished / session-ended /
  // peer-disconnected / peer-reconnected. Mounted once at startup so we never
  // miss events fired between the JS join() call returning and the
  // [session]-effect re-running. The handlers gate on the session by reading
  // from the store at event time.
  useEffect(() => {
    let unlistenUpdate: UnlistenFn | undefined;
    let unlistenDelete: UnlistenFn | undefined;
    let unlistenSync: UnlistenFn | undefined;
    let unlistenEnded: UnlistenFn | undefined;
    let unlistenDisconnected: UnlistenFn | undefined;
    let unlistenReconnected: UnlistenFn | undefined;

    listen<DocUpdatePayload>("multiplayer:doc-update", (event) => {
      const store = getDefaultStore();
      const currentSession = store.get(sessionStateAtom);
      if (!currentSession) {
        return;
      }
      const { key, valueB64 } = event.payload;
      const value = b64ToBytes(valueB64);
      const kind = keyKind(key);
      if (kind === "doc") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(documentAtom, (d) => applyOperation(d, { kind: "put", key, value }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      } else if (kind === "result") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(resultsAtom, (r) => applyResultOperation(r, { kind: "put", key, value }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      } else if (kind === "exec-request" && currentSession.role === "host") {
        // Joiner asked us to run a query; do it and then clear the request.
        void handleExecRequest(key, value);
      } else if (kind === "schema" && currentSession.role === "joiner") {
        // Host pushed its schema. Update the canvas-side atom and feed the
        // Rust LSP cache so completions/diagnostics work for the joiner.
        try {
          const parsed: unknown = JSON.parse(new TextDecoder().decode(value));
          if (!isSchemaShape(parsed)) {
            return;
          }
          store.set(schemaAtom, parsed);
          pushSchemaToLspCache(parsed);
        } catch (e) {
          console.error("multiplayer: bad schema/index payload:", e);
        }
      }
    }).then((u) => {
      unlistenUpdate = u;
    });

    listen<DocDeletePayload>("multiplayer:doc-delete", (event) => {
      const store = getDefaultStore();
      if (!store.get(sessionStateAtom)) {
        return;
      }
      const { key } = event.payload;
      const kind = keyKind(key);
      if (kind === "doc") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(documentAtom, (d) => applyOperation(d, { kind: "del", key }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      } else if (kind === "result") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(resultsAtom, (r) => applyResultOperation(r, { kind: "del", key }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
      // exec-request deletes are confirmation that the host processed a
      // request; nothing to do on the joiner side.
    }).then((u) => {
      unlistenDelete = u;
    });

    listen("multiplayer:sync-finished", () => {
      const store = getDefaultStore();
      const s = store.get(sessionStateAtom);
      if (!s) {
        return;
      }
      store.set(sessionStateAtom, { ...s, status: "active" });
    }).then((u) => {
      unlistenSync = u;
    });

    listen("multiplayer:peer-disconnected", () => {
      const store = getDefaultStore();
      const s = store.get(sessionStateAtom);
      if (!s) {
        return;
      }
      // Only flip from "active" → "reconnecting"; if we're still in
      // "connecting" the initial sync hasn't finished and the disconnect
      // signal would be misleading. (Joiner already shows "SYNC".)
      if (s.status !== "active") {
        return;
      }
      store.set(sessionStateAtom, { ...s, status: "reconnecting" });
    }).then((u) => {
      unlistenDisconnected = u;
    });

    listen("multiplayer:peer-reconnected", () => {
      const store = getDefaultStore();
      const s = store.get(sessionStateAtom);
      if (!s) {
        return;
      }
      if (s.status !== "reconnecting") {
        return;
      }
      store.set(sessionStateAtom, { ...s, status: "active" });
    }).then((u) => {
      unlistenReconnected = u;
    });

    listen("multiplayer:session-ended", () => {
      const store = getDefaultStore();
      const snap = store.get(preSessionSnapshotAtom);
      if (snap) {
        isApplyingRemoteRef.current = true;
        try {
          store.set(documentAtom, snap.document);
          store.set(resultsAtom, snap.results);
        } finally {
          isApplyingRemoteRef.current = false;
        }
        store.set(schemaAtom, snap.schema);
        pushSchemaToLspCache(snap.schema);
      }
      store.set(preSessionSnapshotAtom, null);
      store.set(sessionStateAtom, null);
      store.set(remoteCursorsAtom, {});
      store.set(participantsAtom, {});
    }).then((u) => {
      unlistenEnded = u;
    });

    return () => {
      unlistenUpdate?.();
      unlistenDelete?.();
      unlistenSync?.();
      unlistenEnded?.();
      unlistenDisconnected?.();
      unlistenReconnected?.();
    };
    // Mount once for the lifetime of the app; never resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reference setters so React doesn't warn about unused values; the actual
  // mutations go through the store inside the always-on listeners above.
  void setDoc;
  void setSession;
  void setRemoteCursors;
  void setSnapshot;
  void setResults;
}
