import { useReactFlow } from "@xyflow/react";
import { invoke } from "@tauri-apps/api/core";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { sessionStateAtom } from "./state";

const CURSOR_BROADCAST_MS = 66; // ~15 Hz

/**
 * While a session is active, listens for mouse moves over the document and
 * broadcasts the pointer position in flow coordinates over gossip. Coordinates
 * are flow-space (canvas-invariant) so each peer can render the cursor at the
 * right place regardless of their own viewport.
 *
 * Mount inside <ReactFlowProvider> — uses `useReactFlow().screenToFlowPosition`.
 */
export function useCursorBroadcast(): void {
  const session = useAtomValue(sessionStateAtom);
  const rf = useReactFlow();
  const lastSentRef = useRef(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!session) return;

    let frame: number | null = null;

    const flush = () => {
      frame = null;
      const pos = lastPosRef.current;
      if (!pos) return;
      const flow = rf.screenToFlowPosition({ x: pos.x, y: pos.y });
      lastSentRef.current = Date.now();
      invoke("mp_gossip_send", {
        payload: { type: "cursor", flowX: flow.x, flowY: flow.y },
      }).catch(() => {});
    };

    const onMove = (e: MouseEvent) => {
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      const now = Date.now();
      const elapsed = now - lastSentRef.current;
      if (elapsed >= CURSOR_BROADCAST_MS) {
        flush();
      } else if (frame === null) {
        frame = window.setTimeout(flush, CURSOR_BROADCAST_MS - elapsed);
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame !== null) window.clearTimeout(frame);
    };
  }, [session, rf]);
}
