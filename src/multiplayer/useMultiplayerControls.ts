import { invoke } from "@tauri-apps/api/core";
import { getDefaultStore, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import { activeConnectionAtom } from "../Connection/state";
import { emptyDocument } from "../canvas/emptyDocument";
import {
  documentAtom,
  isApplyingRemoteRef,
  resultsAtom,
} from "../canvas/state";
import { documentToPuts, resultsToPuts } from "./diff";
import {
  preSessionSnapshotAtom,
  remoteCursorsAtom,
  sessionStateAtom,
  participantsAtom,
} from "./state";
import { configAtom, schemaAtom } from "../state";
import {
  type HostSessionInfo,
  type JoinSessionInfo,
  type MultiplayerControls,
  pushOperation,
  pushSchemaToLspCache,
} from "./syncBridgeUtils";
import { colorFromName } from "./identity";
import type { SessionState } from "./types";

export function useMultiplayerControls(): MultiplayerControls {
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
