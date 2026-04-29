import { useReactFlow } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { ids } from "./ids";
import { placeModeAtom } from "./state";
import type { AppEdge, AppNode, DrawPoint } from "./types";
import { useCanvas } from "./useCanvas";

const STROKE_WIDTH = 4;
const STROKE_COLOR = "white";
// Buffer around the points' bbox. perfect-freehand outlines extend roughly
// size/2 (= STROKE_WIDTH * 2) past the input points; pad generously so the
// rendered stroke sits well inside the node's click target.
const PADDING = STROKE_WIDTH * 4;

export function useDrawTool() {
  const placeMode = useAtomValue(placeModeAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const [livePoints, setLivePoints] = useState<DrawPoint[]>([]);
  const livePointsRef = useRef<DrawPoint[]>([]);
  const drawingRef = useRef(false);

  const commit = useCallback(
    (screenPts: DrawPoint[]) => {
      const flow = screenPts.map(([x, y, p]) => {
        const f = rf.screenToFlowPosition({ x, y });
        return [f.x, f.y, p] as DrawPoint;
      });
      const xs = flow.map((p) => p[0]);
      const ys = flow.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      const rel: DrawPoint[] = flow.map(([x, y, p]) => [
        x - minX + PADDING,
        y - minY + PADDING,
        p,
      ]);
      canvas.addNode({
        id: ids.draw(),
        type: "draw",
        position: { x: minX - PADDING, y: minY - PADDING },
        width: maxX - minX + PADDING * 2,
        height: maxY - minY + PADDING * 2,
        style: { pointerEvents: "none" },
        data: { points: rel, strokeWidth: STROKE_WIDTH, color: STROKE_COLOR },
      });
    },
    [rf, canvas],
  );

  useEffect(() => {
    if (placeMode !== "draw") {
      drawingRef.current = false;
      livePointsRef.current = [];
      setLivePoints([]);
      return;
    }
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      // Prevent ReactFlow's delegated handlers (node drag, selection) from
      // firing for this pointerdown. The pane is an ancestor of every node,
      // so without this RF would also start dragging the node we clicked on
      // and we'd commit a duplicate stroke alongside the moved node.
      e.stopPropagation();
      drawingRef.current = true;
      try {
        pane.setPointerCapture(e.pointerId);
      } catch {
        // some pointer types may not support capture
      }
      const initial: DrawPoint[] = [[e.clientX, e.clientY, e.pressure || 0.5]];
      livePointsRef.current = initial;
      setLivePoints(initial);
    };

    const onMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const next: DrawPoint[] = [
        ...livePointsRef.current,
        [e.clientX, e.clientY, e.pressure || 0.5],
      ];
      livePointsRef.current = next;
      setLivePoints(next);
    };

    const onUp = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      const pts = livePointsRef.current;
      livePointsRef.current = [];
      setLivePoints([]);
      if (pts.length >= 2) commit(pts);
    };

    pane.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      pane.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [placeMode, commit]);

  return { livePoints, strokeWidth: STROKE_WIDTH, color: STROKE_COLOR };
}
