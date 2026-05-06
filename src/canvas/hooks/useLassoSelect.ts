import { useReactFlow } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
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

export function useLassoSelect() {
  const placeMode = useAtomValue(placeModeAtom);
  const selectionTool = useAtomValue(selectionToolAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const [points, setPoints] = useState<[number, number][]>([]);
  const startRef = useRef<DragStart | null>(null);
  const pointsRef = useRef<[number, number][]>([]);
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
    if (placeMode !== null || selectionTool !== "lasso") {
      startRef.current = null;
      pointsRef.current = [];
      draggingRef.current = false;
      document.body.classList.remove("is-rubber-band-selecting");
      setPoints([]);
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
      const target = e.target as HTMLElement;
      if (target.closest(".react-flow__node, .react-flow__handle, .react-flow__edge")) {
        return;
      }
      e.preventDefault();
      pane.setPointerCapture(e.pointerId);
      document.body.classList.add("is-rubber-band-selecting");
      const baseline = new Set((rf.getNodes() as AppNode[]).filter(n => n.selected).map(n => n.id));
      startRef.current = { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey, baseline };
      pointsRef.current = [[e.clientX, e.clientY]];
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
      pointsRef.current = [...pointsRef.current, [e.clientX, e.clientY]];
      setPoints(pointsRef.current);

      const flowPolygon = pointsRef.current.map(([x, y]) => {
        const p = rf.screenToFlowPosition({ x, y });
        return [p.x, p.y] as [number, number];
      });

      const inside: string[] = [];
      for (const n of rf.getNodes() as AppNode[]) {
        const nw = n.measured?.width ?? n.width ?? 0;
        const nh = n.measured?.height ?? n.height ?? 0;
        const cx = n.position.x + nw / 2;
        const cy = n.position.y + nh / 2;
        if (pointInPolygon([cx, cy], flowPolygon)) {
          inside.push(n.id);
        }
      }

      const wanted = start.shiftKey ? [...new Set([...start.baseline, ...inside])] : inside;
      canvas.selectOnly(wanted);
    };

    const onUp = () => {
      const wasDragging = draggingRef.current;
      startRef.current = null;
      pointsRef.current = [];
      draggingRef.current = false;
      setPoints([]);
      clearSelectionGuard();
      if (wasDragging) {
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

  return { points };
}

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
