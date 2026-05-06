import { useReactFlow } from "@xyflow/react";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { defaultDimensions, makeNode, minDimensions } from "../defaults";
import { focusEditor } from "../nodes/editorFocusRegistry";
import { placeModeAtom } from "../state";
import type { AppEdge, AppNode, AppNodeType } from "../types";
import { useCanvas } from "./useCanvas";

const DRAG_THRESHOLD_PX = 5;

export function usePlaceTool() {
  const [placeMode, setPlaceMode] = useAtom(placeModeAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const placedIdRef = useRef<string | null>(null);
  const placeModeRef = useRef<AppNodeType | null>(null);

  placeModeRef.current = placeMode;

  useEffect(() => {
    if (placeMode === null || placeMode === "draw") {
      // If a placement node was committed but the mode was cancelled
      // mid-drag (e.g. Esc), drop the in-progress node.
      const cancelledId = placedIdRef.current;
      if (cancelledId !== null) {
        canvas.deleteNode(cancelledId);
      }
      startRef.current = null;
      placedIdRef.current = null;
      return;
    }
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) {
      return;
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) {
        return;
      }
      // Prevent ReactFlow's pane handlers (rubber-band selection, etc.)
      // from running for this pointer interaction — placement owns it.
      e.stopPropagation();
      pane.setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMove = (e: PointerEvent) => {
      const start = startRef.current;
      const mode = placeModeRef.current;
      if (!start || mode === null || mode === "draw") {
        return;
      }
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (placedIdRef.current === null) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
          return;
        }
        const a = rf.screenToFlowPosition({ x: start.x, y: start.y });
        const b = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const min = minDimensions[mode];
        const node = {
          ...makeNode(mode, { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }),
          width: Math.max(Math.abs(b.x - a.x), min.w),
          height: Math.max(Math.abs(b.y - a.y), min.h),
        };
        placedIdRef.current = node.id;
        canvas.addNode(node);
        canvas.selectOnly(node.id);
        return;
      }
      const a = rf.screenToFlowPosition({ x: start.x, y: start.y });
      const b = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const min = minDimensions[mode];
      const width = Math.max(Math.abs(b.x - a.x), min.w);
      const height = Math.max(Math.abs(b.y - a.y), min.h);
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      canvas.updateNode(placedIdRef.current, { position: { x, y }, width, height });
    };

    const onUp = (e: PointerEvent) => {
      const start = startRef.current;
      const mode = placeModeRef.current;
      const placedId = placedIdRef.current;
      startRef.current = null;
      placedIdRef.current = null;
      if (!start || mode === null || mode === "draw") {
        return;
      }

      if (placedId !== null) {
        const a = rf.screenToFlowPosition({ x: start.x, y: start.y });
        const b = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const min = minDimensions[mode];
        const width = Math.max(Math.abs(b.x - a.x), min.w);
        const height = Math.max(Math.abs(b.y - a.y), min.h);
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        rf.setCenter(x + width / 2, y + height / 2, { zoom: 1, duration: 300 });
        if (mode === "query" || mode === "ai-prompt") {
          focusEditor(placedId);
        }
        setPlaceMode(null);
        return;
      }

      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dims = defaultDimensions[mode];
      const node = makeNode(mode, {
        x: flowPos.x - dims.w / 2,
        y: flowPos.y - dims.h / 2,
      });
      canvas.addNode(node);
      canvas.selectOnly(node.id);
      rf.setCenter(flowPos.x, flowPos.y, { zoom: 1, duration: 300 });
      if (node.type === "query" || node.type === "ai-prompt") {
        focusEditor(node.id);
      }
      setPlaceMode(null);
    };

    pane.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      pane.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [placeMode, rf, canvas, setPlaceMode]);
}
