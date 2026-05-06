import { useReactFlow } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { placeModeAtom, selectionToolAtom } from "../state";
import type { AppEdge, AppNode } from "../types";
import { useCanvas } from "./useCanvas";

const DRAG_THRESHOLD_PX = 4;

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragStart {
  x: number;
  y: number;
  shiftKey: boolean;
  baseline: Set<string>;
}

export function useRubberBandSelect() {
  const placeMode = useAtomValue(placeModeAtom);
  const selectionTool = useAtomValue(selectionToolAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const [rect, setRect] = useState<SelectionRect | null>(null);
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
      setRect(null);
      return;
    }
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) {
      return;
    }

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
      setRect({
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        w: Math.abs(dx),
        h: Math.abs(dy),
      });

      const a = rf.screenToFlowPosition({ x: start.x, y: start.y });
      const b = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
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
      canvas.selectOnly(wanted);
    };

    const onUp = () => {
      const wasDragging = draggingRef.current;
      startRef.current = null;
      draggingRef.current = false;
      setRect(null);
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
      clearSelectionGuard();
    };
  }, [placeMode, selectionTool, rf, canvas]);

  return { rect };
}
