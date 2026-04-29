import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo } from "react";
import { activeConnectionAtom } from "../Connection/state";
import { emptyDocument } from "../canvas/emptyDocument";
import { executeQueries } from "../canvas/executeQueries";
import {
  canvasApiAtom,
  documentAtom,
  isApplyingRemoteRef,
  resultsAtom,
  subscribeDocumentMutations,
  subscribeResultsMutations,
} from "../canvas/state";
import {
  applyOperation,
  applyResultOperation,
  b64ToBytes,
  bytesToB64,
  diffDocs,
  diffResults,
  documentToPuts,
  execRequestKey,
  keyKind,
  resultsToPuts,
  SCHEMA_INDEX_KEY,
} from "./diff";
import { preSessionSnapshotAtom, remoteCursorsAtom, sessionStateAtom } from "./state";
import type { AppNode } from "../canvas/types";
import { configAtom, schemaAtom, type DatabaseResult, type Schema } from "../state";
import type { Operation, SessionState } from "./types";
import { colorFromName } from "./identity";

interface HostSessionInfo {
  ticket: string;
  author: string;
  namespaceId: string;
}

interface JoinSessionInfo {
  author: string;
  namespaceId: string;
}

interface DocUpdatePayload {
  key: string;
  valueB64: string;
  author: string;
}

interface DocDeletePayload {
  key: string;
  author: string;
}

interface GossipRecvPayload {
  payload: { type?: string } & Record<string, unknown>;
  author: string;
}

const PRESENCE_HEARTBEAT_MS = 5000;
const PEER_STALE_MS = 15000;

function pushOperation(op: Operation): void {
  if (op.kind === "put") {
    invoke("mp_doc_put", {
      key: op.key,
      valueB64: bytesToB64(op.value),
    }).catch((e) => console.error("mp_doc_put failed:", op.key, e));
  } else {
    invoke("mp_doc_del", { key: op.key }).catch((e) =>
      console.error("mp_doc_del failed:", op.key, e),
    );
  }
}

interface ExecRequestPayload {
  nodeId: string;
  queries: string[];
}

function isSchemaShape(v: unknown): v is Schema {
  if (!v || typeof v !== "object") {
    return false;
  }
  const s = v as Record<string, unknown>;
  return (
    typeof s.tables === "object" &&
    s.tables !== null &&
    typeof s.references === "object" &&
    s.references !== null &&
    typeof s.primaryKeys === "object" &&
    s.primaryKeys !== null
  );
}

/**
 * Refresh the Rust-side LSP schema cache from a JS-side `Schema`. Joiners
 * never call `get_schema` (no DB connection), so without this the LSP
 * backend's `SchemaCache` stays empty and completions / diagnostics return
 * nothing. We push the host's schema to `schema/index` over the iroh-doc;
 * the inbound listener for that key both updates `schemaAtom` (for canvas
 * UI) and calls this to feed the LSP. Empty-schema calls route through
 * `lsp_clear_schema_cache` to keep the Rust side tidy.
 */
function pushSchemaToLspCache(schema: Schema): void {
  const isEmpty =
    Object.keys(schema.tables).length === 0 &&
    Object.keys(schema.references).length === 0 &&
    Object.keys(schema.primaryKeys).length === 0;
  if (isEmpty) {
    invoke("lsp_clear_schema_cache").catch((e) =>
      console.error("lsp_clear_schema_cache failed:", e),
    );
    return;
  }
  invoke("lsp_set_schema_cache", {
    tables: schema.tables,
    references: schema.references,
    primaryKeys: schema.primaryKeys,
  }).catch((e) => console.error("lsp_set_schema_cache failed:", e));
}

/**
 * Joiner-side: forward an "execute these queries against this node" request to
 * the host via an `exec-requests/<id>` doc entry. The host's syncBridge picks
 * it up, runs against the host's DB, and propagates the result node + rows
 * back via the normal doc/results sync.
 */
export async function requestRemoteExecution(nodeId: string, queries: string[]): Promise<void> {
  const requestId = nanoid(8);
  const payload: ExecRequestPayload = { nodeId, queries };
  await invoke("mp_doc_put", {
    key: execRequestKey(requestId),
    valueB64: bytesToB64(new TextEncoder().encode(JSON.stringify(payload))),
  });
}

async function handleExecRequest(key: string, value: Uint8Array): Promise<void> {
  const store = getDefaultStore();
  const canvas = store.get(canvasApiAtom);
  if (!canvas) {
    return;
  }

  let payload: ExecRequestPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(value)) as ExecRequestPayload;
  } catch (e) {
    console.error("multiplayer: bad exec-request payload:", e);
    invoke("mp_doc_del", { key }).catch(() => {});
    return;
  }

  const sourceNode = canvas.getNode(payload.nodeId) as AppNode | undefined;
  if (!sourceNode) {
    console.warn("multiplayer: exec-request for unknown node", payload.nodeId);
    invoke("mp_doc_del", { key }).catch(() => {});
    return;
  }

  const setResults = (
    updater:
      | Record<string, DatabaseResult>
      | ((prev: Record<string, DatabaseResult>) => Record<string, DatabaseResult>),
  ) => {
    // Delegating directly to the store avoids needing a hook context here;
    // the wrapped resultsAtom still notifies our outbound listener.
    store.set(resultsAtom, updater);
  };

  try {
    await executeQueries(canvas, setResults, sourceNode, payload.queries);
  } catch (e) {
    console.error("multiplayer: exec-request execution failed:", e);
  } finally {
    invoke("mp_doc_del", { key }).catch(() => {});
  }
}

export interface MultiplayerControls {
  host: () => Promise<HostSessionInfo>;
  join: (ticket: string) => Promise<JoinSessionInfo>;
  end: () => Promise<void>;
}

/**
 * Wires the canvas document to a multiplayer session and exposes a small
 * imperative control surface (host/join/end). Mount once at the app root.
 */
export function useMultiplayer(): MultiplayerControls {
  useSyncBridge();
  useGossipBridge();
  return useMultiplayerControls();
}

import { participantsAtom } from "./state";
import type { Peer } from "./types";

function useGossipBridge(): void {
  useEffect(() => {
    let unlistenRecv: UnlistenFn | undefined;

    listen<GossipRecvPayload>("multiplayer:gossip-recv", (event) => {
      const store = getDefaultStore();
      const session = store.get(sessionStateAtom);
      if (!session) {
        return;
      }
      const { payload, author } = event.payload;
      if (author === session.myAuthor) {
        return;
      }

      const now = Date.now();
      if (payload.type === "cursor") {
        const flowX = Number(payload.flowX);
        const flowY = Number(payload.flowY);
        const pageId = typeof payload.pageId === "string" ? payload.pageId : "";
        if (!Number.isFinite(flowX) || !Number.isFinite(flowY) || !pageId) {
          return;
        }
        store.set(remoteCursorsAtom, (prev) => ({
          ...prev,
          [author]: { flowX, flowY, pageId, updatedAt: now },
        }));
        // Cursor traffic counts as liveness — without this, presence-only
        // updates (every 5s) get pruned at 15s after just three dropped
        // gossip packets even though cursors are flowing fine. Throttle to
        // once per peer per 2s so SharePopover doesn't re-render at 15Hz.
        store.set(participantsAtom, (prev) => {
          const peer = prev[author];
          if (!peer) {
            return prev;
          }
          if (now - peer.lastSeen < 2000) {
            return prev;
          }
          return { ...prev, [author]: { ...peer, lastSeen: now } };
        });
      } else if (payload.type === "presence") {
        const name = typeof payload.name === "string" ? payload.name : "Peer";
        const color = typeof payload.color === "string" ? payload.color : "#888";
        const isHost = Boolean(payload.isHost);
        store.set(participantsAtom, (prev) => ({
          ...prev,
          [author]: {
            author,
            name,
            color,
            isHost,
            lastSeen: now,
          } satisfies Peer,
        }));
      } else if (payload.type === "leave") {
        // Peer is shutting down cleanly; drop them immediately rather than
        // waiting for the 15s prune timeout.
        store.set(participantsAtom, (prev) => {
          if (!(author in prev)) {
            return prev;
          }
          const { [author]: _gone, ...rest } = prev;
          return rest;
        });
        store.set(remoteCursorsAtom, (prev) => {
          if (!(author in prev)) {
            return prev;
          }
          const { [author]: _gone, ...rest } = prev;
          return rest;
        });
      }
    }).then((u) => {
      unlistenRecv = u;
    });

    return () => {
      unlistenRecv?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presence heartbeat + stale-peer pruning (only while session active).
  const session = useAtomValue(sessionStateAtom);
  useEffect(() => {
    if (!session) {
      return;
    }

    const sendPresence = () => {
      invoke("mp_gossip_send", {
        payload: {
          type: "presence",
          name: session.myName,
          color: session.myColor,
          isHost: session.role === "host",
        },
      }).catch(() => {});
    };

    sendPresence();
    const heartbeat = window.setInterval(sendPresence, PRESENCE_HEARTBEAT_MS);
    const prune = window.setInterval(() => {
      const store = getDefaultStore();
      const cutoff = Date.now() - PEER_STALE_MS;
      store.set(participantsAtom, (prev) => {
        let changed = false;
        const next: Record<string, Peer> = {};
        for (const [author, peer] of Object.entries(prev)) {
          if (peer.lastSeen >= cutoff) {
            next[author] = peer;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      store.set(remoteCursorsAtom, (prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [author, cur] of Object.entries(prev)) {
          if (cur.updatedAt >= cutoff) {
            next[author] = cur;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(prune);
    };
  }, [session]);
}

function useSyncBridge(): void {
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
      const session = store.get(sessionStateAtom);
      if (!session) {
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
      } else if (kind === "exec-request" && session.role === "host") {
        // Joiner asked us to run a query; do it and then clear the request.
        void handleExecRequest(key, value);
      } else if (kind === "schema" && session.role === "joiner") {
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

function useMultiplayerControls(): MultiplayerControls {
  const setSession = useSetAtom(sessionStateAtom);
  const setDoc = useSetAtom(documentAtom);
  const setResults = useSetAtom(resultsAtom);
  const setSnapshot = useSetAtom(preSessionSnapshotAtom);
  const setRemoteCursors = useSetAtom(remoteCursorsAtom);
  const setParticipants = useSetAtom(participantsAtom);
  const setSchema = useSetAtom(schemaAtom);

  const host = useCallback(async () => {
    const store = getDefaultStore();
    if (store.get(sessionStateAtom)) {
      throw new Error("session already active");
    }
    const info = await invoke<HostSessionInfo>("mp_host_session");
    const name = store.get(configAtom)?.name ?? "Anonymous";
    const next: SessionState = {
      role: "host",
      status: "active",
      ticket: info.ticket,
      myAuthor: info.author,
      myColor: colorFromName(name),
      myName: name,
      namespaceId: info.namespaceId,
    };
    // Set the session BEFORE pushing the initial state so the outbound
    // documentMutations listener is subscribed (host's existing canvas isn't
    // a mutation by itself; we lower it to puts explicitly here).
    setSession(next);
    const current = store.get(documentAtom);
    const currentResults = store.get(resultsAtom);
    for (const op of documentToPuts(current)) {
      pushOperation(op);
    }
    for (const op of resultsToPuts(currentResults)) {
      pushOperation(op);
    }
    return info;
  }, [setSession]);

  const join = useCallback(
    async (ticket: string) => {
      const store = getDefaultStore();
      if (store.get(sessionStateAtom)) {
        throw new Error("session already active");
      }

      const document = store.get(documentAtom);
      const results = store.get(resultsAtom);
      const schema = store.get(schemaAtom);
      const conn = store.get(activeConnectionAtom);

      // Force-flush before swapping so the joiner's last edits land on disk.
      if (conn) {
        try {
          await invoke("save", {
            workspace: conn.workspaceName,
            connectionName: conn.connection.name,
            contents: JSON.stringify(document),
          });
          await invoke("save_results", {
            workspace: conn.workspaceName,
            connectionName: conn.connection.name,
            contents: JSON.stringify(results),
          });
        } catch (e) {
          console.error("force-flush failed before join:", e);
        }
      }

      setSnapshot({ document, results, schema });

      // Swap to a fresh empty document; host's replica will stream in.
      isApplyingRemoteRef.current = true;
      try {
        setDoc(emptyDocument());
        setResults({});
      } finally {
        isApplyingRemoteRef.current = false;
      }

      const info = await invoke<JoinSessionInfo>("mp_join_session", { ticket });
      const name = store.get(configAtom)?.name ?? "Anonymous";
      const next: SessionState = {
        role: "joiner",
        status: "connecting",
        ticket,
        myAuthor: info.author,
        myColor: colorFromName(name),
        myName: name,
        namespaceId: info.namespaceId,
      };
      setSession(next);
      return info;
    },
    [setSession, setSnapshot, setDoc, setResults],
  );

  const end = useCallback(async () => {
    const store = getDefaultStore();
    const session = store.get(sessionStateAtom);
    if (!session) {
      return;
    }
    // Capture the snapshot up front so it can't be cleared out from under us
    // (e.g. by the `multiplayer:session-ended` listener firing concurrently).
    const snapshot = store.get(preSessionSnapshotAtom);

    // Notify peers we're leaving so they drop us from the participants list
    // immediately instead of waiting for the 15s prune. Best-effort — the
    // gossip task may already be unreachable if the network dropped.
    try {
      await invoke("mp_gossip_send", { payload: { type: "leave" } });
    } catch {
      // ignore — we're tearing down anyway
    }

    // Tear down the Rust session. mp_end_session is infallible today, but
    // wrap it defensively so a failure here doesn't skip the JS-side restore.
    try {
      await invoke("mp_end_session");
    } catch (e) {
      console.error("mp_end_session failed:", e);
    }

    // Restore the joiner's pre-session canvas. Done synchronously inside an
    // `isApplyingRemoteRef` guard so the outbound mutation listeners (still
    // subscribed until `setSession(null)` below) don't try to push these
    // writes to a dead session.
    if (session.role === "joiner" && snapshot) {
      isApplyingRemoteRef.current = true;
      try {
        setDoc(snapshot.document);
        setResults(snapshot.results);
      } finally {
        isApplyingRemoteRef.current = false;
      }
      // Restore the joiner's own DB schema (the host's was written to
      // `schemaAtom` and the Rust LSP cache during the session — both need
      // to flip back). `pushSchemaToLspCache` clears the cache when the
      // restored schema is empty (joiner had no DB connection).
      setSchema(snapshot.schema);
      pushSchemaToLspCache(snapshot.schema);
    }

    // Order matters here:
    //   1. setSession(null) — flips the role check in `useLoadDocument` from
    //      "joiner: skip" to "no session: would normally load", but the
    //      snapshot gate added there prevents the disk reload from racing
    //      with our restore above. Also flips status atoms so the popover
    //      starts hiding session UI on the next render.
    //   2. setRemoteCursors / setParticipants — UI cleanup.
    //   3. setSnapshot(null) LAST — this is the explicit handoff to
    //      `useLoadDocument`. Clearing it re-enables disk-load (which is now
    //      a no-op for the joiner since the snapshot we just restored is the
    //      same content that was force-flushed at join() time).
    setSession(null);
    setRemoteCursors({});
    setParticipants({});
    setSnapshot(null);
  }, [setSession, setSnapshot, setDoc, setResults, setRemoteCursors, setParticipants, setSchema]);

  const controls = useMemo<MultiplayerControls>(() => ({ host, join, end }), [host, join, end]);

  // Stage 2 devtools surface: window.peekMultiplayer.host() / .join('<ticket>') / .end().
  useEffect(() => {
    interface PeekMultiplayerWindow extends Window {
      peekMultiplayer?: MultiplayerControls;
    }
    const w = window as PeekMultiplayerWindow;
    w.peekMultiplayer = controls;
    return () => {
      if (w.peekMultiplayer === controls) {
        delete w.peekMultiplayer;
      }
    };
  }, [controls]);

  return controls;
}
