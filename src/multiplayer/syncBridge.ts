import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getDefaultStore, useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  participantsAtom,
  remoteCursorsAtom,
  sessionStateAtom,
} from "./state";
import { type MultiplayerControls, requestRemoteExecution } from "./syncBridgeUtils";
import { useSyncBridge } from "./useSyncBridge";
import { useMultiplayerControls } from "./useMultiplayerControls";
import type { Peer } from "./types";

export type { MultiplayerControls };
export { requestRemoteExecution };

interface GossipRecvPayload {
  payload: { type?: string } & Record<string, unknown>;
  author: string;
}

const PRESENCE_HEARTBEAT_MS = 5000;
const PEER_STALE_MS = 15000;

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

/**
 * Wires the canvas document to a multiplayer session and exposes a small
 * imperative control surface (host/join/end). Mount once at the app root.
 */
export function useMultiplayer(): MultiplayerControls {
  useSyncBridge();
  useGossipBridge();
  return useMultiplayerControls();
}
