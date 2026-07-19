import { useReactFlow, type Viewport } from "@xyflow/react";
import { invoke } from "@tauri-apps/api/core";
import { getDefaultStore, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { documentAtom } from "../canvas/state";
import { sessionStateAtom } from "./state";

// ~15 Hz, matching the cursor broadcaster.
const VIEWPORT_BROADCAST_MS = 66;
// Idle peers still advertise their view so follow-start is snappy.
const VIEWPORT_HEARTBEAT_MS = 5000;

/**
 * While a session is active, broadcasts the local camera over gossip as the
 * flow-space center of the pane plus the zoom. Coordinates are pane-size
 * independent so a follower re-centers faithfully on any window size.
 *
 * Returns a throttled handler to wire into React Flow's `onMove`; also fires an
 * initial send and a low-frequency heartbeat for idle peers.
 *
 * Mount inside <ReactFlowProvider> — uses `useReactFlow()`.
 */
export function useViewportBroadcast(): (viewport: Viewport) => void {
  const session = useAtomValue(sessionStateAtom);
  const rf = useReactFlow();
  const lastSentRef = useRef(0);
  const lastViewportRef = useRef<Viewport | null>(null);
  const frameRef = useRef<number | null>(null);

  const send = useCallback((vp: Viewport) => {
    const rect = document.querySelector<HTMLElement>(".react-flow")?.getBoundingClientRect();
    const width = rect?.width ?? window.innerWidth;
    const height = rect?.height ?? window.innerHeight;
    // React Flow's transform is pane-relative, so the pane center in flow space
    // is (paneCenter - translate) / zoom.
    const centerX = (width / 2 - vp.x) / vp.zoom;
    const centerY = (height / 2 - vp.y) / vp.zoom;
    const pageId = getDefaultStore().get(documentAtom).activePageId;
    lastSentRef.current = Date.now();
    invoke("mp_gossip_send", {
      payload: { type: "viewport", centerX, centerY, zoom: vp.zoom, pageId },
    }).catch(() => {});
  }, []);

  const broadcast = useCallback(
    (vp: Viewport) => {
      lastViewportRef.current = vp;
      const elapsed = Date.now() - lastSentRef.current;
      if (elapsed >= VIEWPORT_BROADCAST_MS) {
        send(vp);
      } else if (frameRef.current === null) {
        frameRef.current = window.setTimeout(() => {
          frameRef.current = null;
          if (lastViewportRef.current) {
            send(lastViewportRef.current);
          }
        }, VIEWPORT_BROADCAST_MS - elapsed);
      }
    },
    [send],
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    send(rf.getViewport());
    const heartbeat = window.setInterval(() => send(rf.getViewport()), VIEWPORT_HEARTBEAT_MS);
    return () => {
      window.clearInterval(heartbeat);
      if (frameRef.current !== null) {
        window.clearTimeout(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [session, rf, send]);

  return broadcast;
}
