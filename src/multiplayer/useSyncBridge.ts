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
import { diffDocs, diffResults } from "./diff";
import { CONNECTION_ENGINE_KEY, keyKind, SCHEMA_INDEX_KEY } from "./keys";
import { handleAgentCancel, handleAgentRequest } from "./agentProxy";
import { handleLspRequest } from "./lspProxy";
import { b64ToBytes } from "./bytes";
import {
  followingAuthorAtom,
  hostEngineAtom,
  multiplayerSyncIssueAtom,
  preSessionSnapshotAtom,
  remoteCursorsAtom,
  remoteViewportsAtom,
  sessionStateAtom,
  participantsAtom,
} from "./state";
import { schemaAtom } from "../state";
import { activeEngineAtom, isEngine } from "../Connection/engine";
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
  const engine = useAtomValue(activeEngineAtom);
  const setDoc = useSetAtom(documentAtom);
  const setSession = useSetAtom(sessionStateAtom);
  const setRemoteCursors = useSetAtom(remoteCursorsAtom);
  const setSnapshot = useSetAtom(preSessionSnapshotAtom);
  const setResults = useSetAtom(resultsAtom);

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

  useEffect(() => {
    if (!session || session.role !== "host") {
      return;
    }
    pushOperation({
      kind: "put",
      key: CONNECTION_ENGINE_KEY,
      value: new TextEncoder().encode(JSON.stringify(engine)),
    });
  }, [engine, session]);

  useEffect(() => {
    let unlistenUpdate: UnlistenFn | undefined;
    let unlistenDelete: UnlistenFn | undefined;
    let unlistenSync: UnlistenFn | undefined;
    let unlistenEnded: UnlistenFn | undefined;
    let unlistenDisconnected: UnlistenFn | undefined;
    let unlistenReconnected: UnlistenFn | undefined;

    listen<DocUpdatePayload>("multiplayer:doc-update", event => {
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
          store.set(documentAtom, d => applyOperation(d, { kind: "put", key, value }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      } else if (kind === "result") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(resultsAtom, r => applyResultOperation(r, { kind: "put", key, value }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      } else if (kind === "exec-request" && currentSession.role === "host") {
        void handleExecRequest(key, value);
      } else if (kind === "agent-request" && currentSession.role === "host") {
        void handleAgentRequest(key, value);
      } else if (kind === "agent-cancel" && currentSession.role === "host") {
        handleAgentCancel(key);
      } else if (kind === "lsp-request" && currentSession.role === "host") {
        void handleLspRequest(key, value);
      } else if (kind === "schema" && currentSession.role === "joiner") {
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
      } else if (kind === "engine" && currentSession.role === "joiner") {
        try {
          const parsed: unknown = JSON.parse(new TextDecoder().decode(value));
          if (isEngine(parsed)) {
            store.set(hostEngineAtom, parsed);
          }
        } catch (e) {
          console.error("multiplayer: bad connection/engine payload:", e);
        }
      }
    }).then(u => {
      unlistenUpdate = u;
    });

    listen<DocDeletePayload>("multiplayer:doc-delete", event => {
      const store = getDefaultStore();
      if (!store.get(sessionStateAtom)) {
        return;
      }
      const { key } = event.payload;
      const kind = keyKind(key);
      if (kind === "doc") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(documentAtom, d => applyOperation(d, { kind: "del", key }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      } else if (kind === "result") {
        isApplyingRemoteRef.current = true;
        try {
          store.set(resultsAtom, r => applyResultOperation(r, { kind: "del", key }));
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
    }).then(u => {
      unlistenDelete = u;
    });

    listen("multiplayer:sync-finished", () => {
      const store = getDefaultStore();
      const s = store.get(sessionStateAtom);
      if (!s) {
        return;
      }
      store.set(sessionStateAtom, { ...s, status: "active" });
    }).then(u => {
      unlistenSync = u;
    });

    listen("multiplayer:peer-disconnected", () => {
      const store = getDefaultStore();
      const s = store.get(sessionStateAtom);
      if (!s) {
        return;
      }
      if (s.status !== "active") {
        return;
      }
      store.set(sessionStateAtom, { ...s, status: "reconnecting" });
    }).then(u => {
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
    }).then(u => {
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
      store.set(hostEngineAtom, "unknown");
      store.set(remoteCursorsAtom, {});
      store.set(remoteViewportsAtom, {});
      store.set(participantsAtom, {});
      store.set(followingAuthorAtom, null);
      store.set(multiplayerSyncIssueAtom, { count: 0, lastError: null });
    }).then(u => {
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
  }, []);

  void setDoc;
  void setSession;
  void setRemoteCursors;
  void setSnapshot;
  void setResults;
}
