import { useReactFlow } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { placeModeAtom, selectionToolAtom } from "../state";
import type { AppEdge, AppNode } from "../types";
import { useCanvas } from "./useCanvas";

const DRAG_THRESHOLD_PX = 4;

interface DragStart {
  x: number;
  y: number;
  shiftKey: boolean;
  baseline: Set<string>;
}

// Drive the selection box straight from the pointer via the DOM — never React
// state. A re-render here would churn the whole canvas subtree (re-running
// selection highlighting and re-reconciling every node) on every pointermove,
// which is exactly the work we want off the hot path. Same trade-off as
// `useInteractionState`.
function positionRect(el: HTMLDivElement | null, x: number, y: number, w: number, h: number) {
  if (!el) {
    return;
  }
  el.style.display = "block";
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
}

function hideRect(el: HTMLDivElement | null) {
  if (el) {
    el.style.display = "none";
  }
}

export function useRubberBandSelect() {
  const placeMode = useAtomValue(placeModeAtom);
  const selectionTool = useAtomValue(selectionToolAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const rectRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<DragStart | null>(null);
  const draggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const spaceHeldRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = e.type === "keydown";
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  useEffect(() => {
    if (placeMode !== null || selectionTool !== "default") {
      startRef.current = null;
      draggingRef.current = false;
      document.body.classList.remove("is-rubber-band-selecting");
      hideRect(rectRef.current);
      return;
    }
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) {
      return;
    }

    // Coalesce the expensive part — hit-testing every node and pushing a new
    // selection through React Flow — to one run per frame. pointermove can fire
    // several times per frame; the rectangle itself still tracks every event.
    let frame: number | null = null;
    const pointer = { x: 0, y: 0 };
    let lastSelectionKey = "";

    const applySelection = () => {
      frame = null;
      const start = startRef.current;
      if (!start) {
        return;
      }
      const a = rf.screenToFlowPosition({ x: start.x, y: start.y });
      const b = rf.screenToFlowPosition({ x: pointer.x, y: pointer.y });
      const left = Math.min(a.x, b.x);
      const top = Math.min(a.y, b.y);
      const right = Math.max(a.x, b.x);
      const bottom = Math.max(a.y, b.y);

      const overlapping: string[] = [];
      for (const n of rf.getNodes() as AppNode[]) {
        const nw = n.measured?.width ?? n.width ?? 0;
        const nh = n.measured?.height ?? n.height ?? 0;
        const nl = n.position.x;
        const nt = n.position.y;
        const nr = nl + nw;
        const nb = nt + nh;
        if (nr >= left && nl <= right && nb >= top && nt <= bottom) {
          overlapping.push(n.id);
        }
      }

      const wanted = start.shiftKey
        ? [...new Set([...start.baseline, ...overlapping])]
        : overlapping;
      // Skip the re-render when the set is unchanged across frames (e.g. the
      // pointer is still sweeping empty canvas).
      const key = wanted.toSorted().join("\n");
      if (key === lastSelectionKey) {
        return;
      }
      lastSelectionKey = key;
      canvas.selectOnly(wanted);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || spaceHeldRef.current) {
        return;
      }
      // The pane is an ancestor of every node, so clicks on nodes/handles/
      // edges bubble up here. Don't intercept those — RF needs them for
      // node-drag, connection-drag, and edge-select.
      const target = e.target as HTMLElement;
      if (target.closest(".react-flow__node, .react-flow__handle, .react-flow__edge")) {
        return;
      }
      e.preventDefault();
      pane.setPointerCapture(e.pointerId);
      document.body.classList.add("is-rubber-band-selecting");
      const baseline = new Set((rf.getNodes() as AppNode[]).filter(n => n.selected).map(n => n.id));
      startRef.current = { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey, baseline };
      draggingRef.current = false;
      lastSelectionKey = "";
    };

    const clearSelectionGuard = () => {
      document.body.classList.remove("is-rubber-band-selecting");
    };

    const onMove = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start) {
        return;
      }
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!draggingRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
          return;
        }
        draggingRef.current = true;
      }
      positionRect(
        rectRef.current,
        Math.min(start.x, e.clientX),
        Math.min(start.y, e.clientY),
        Math.abs(dx),
        Math.abs(dy),
      );
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (frame === null) {
        frame = requestAnimationFrame(applySelection);
      }
    };

    const onUp = () => {
      const wasDragging = draggingRef.current;
      startRef.current = null;
      draggingRef.current = false;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      hideRect(rectRef.current);
      clearSelectionGuard();
      if (wasDragging) {
        // Block the synthetic click that follows pointerup so React Flow's
        // onPaneClick doesn't deselect everything we just selected.
        justDraggedRef.current = true;
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (justDraggedRef.current) {
        justDraggedRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    pane.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    pane.addEventListener("click", onClickCapture, true);
    return () => {
      pane.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      pane.removeEventListener("click", onClickCapture, true);
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      clearSelectionGuard();
    };
  }, [placeMode, selectionTool, rf, canvas]);

  return { rectRef };
}
