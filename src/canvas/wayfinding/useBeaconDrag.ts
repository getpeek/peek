import { useSetAtom } from "jotai";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useInteractionState } from "../hooks/useInteractionState";
import { nodesAtom } from "../state";

// Pointer travel (screen px) before a press is treated as a drag rather than a
// click — keeps a slightly shaky click-to-enter from moving the region.
const DRAG_THRESHOLD_PX = 3;

type DragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  tz: number;
  moved: boolean;
};

/**
 * Drag a region beacon to translate all of its member nodes together. Regions
 * store no position of their own, so moving the members re-derives the box and
 * the beacon/halo follow. Writing through `nodesAtom` folds the move into undo
 * and autosave with no extra wiring.
 */
export function useBeaconDrag(memberIds: string[], tz: number) {
  const setNodes = useSetAtom(nodesAtom);
  const interaction = useInteractionState();
  const drag = useRef<DragState | null>(null);
  // The `click` that follows a drag arrives after pointerup has cleared `drag`,
  // so the beacon reads this to swallow the stray click-to-enter.
  const draggedRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) {
      return;
    }
    draggedRef.current = false;
    drag.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      tz,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    interaction.begin();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) {
      return;
    }
    const traveled = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
    if (!state.moved && traveled < DRAG_THRESHOLD_PX) {
      return;
    }
    state.moved = true;
    draggedRef.current = true;
    const dx = (e.clientX - state.lastX) / state.tz;
    const dy = (e.clientY - state.lastY) / state.tz;
    state.lastX = e.clientX;
    state.lastY = e.clientY;

    const members = new Set(memberIds);
    setNodes(ns =>
      ns.map(n =>
        members.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
      ),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) {
      return;
    }
    e.currentTarget.releasePointerCapture(state.pointerId);
    drag.current = null;
    interaction.endDebounced();
  };

  return { onPointerDown, onPointerMove, onPointerUp, draggedRef };
}
