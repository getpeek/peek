import { useCallback, useEffect, useState } from "react";
import type { CellRect } from "./useCellSelection";

type GhostHover =
  | { kind: "cell"; pos: number; col: number }
  | { kind: "header"; col: number }
  | null;

/**
 * Ghost outline — a dashed hover preview of what a click/drag would select: the
 * hovered cell, the whole column when hovering its header, or the row while
 * Shift is held. It never fights the live selection: it's suppressed while a
 * button is down (dragging), while Cmd/Ctrl is held (a click moves the node),
 * and over a cell already inside the active selection.
 */
export function useGhostSelection({
  visibleCount,
  columnCount,
  cellRect,
}: {
  visibleCount: number;
  columnCount: number;
  cellRect: CellRect | null;
}) {
  const [hover, setHover] = useState<GhostHover>(null);
  const [shift, setShift] = useState(false);
  const [move, setMove] = useState(false);

  useEffect(() => {
    const sync = (e: KeyboardEvent) => {
      setShift(e.shiftKey);
      setMove(e.metaKey || e.ctrlKey);
    };
    const reset = () => {
      setShift(false);
      setMove(false);
    };
    // A starting click/drag drops the stale ghost so it doesn't linger mid-drag.
    const onDown = () => setHover(null);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", reset);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", reset);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  const onCellEnter = useCallback((e: React.MouseEvent, pos: number, col: number) => {
    if (e.buttons !== 0) {
      return;
    }
    setHover({ kind: "cell", pos, col });
  }, []);

  const onHeaderEnter = useCallback((col: number) => setHover({ kind: "header", col }), []);
  const onLeave = useCallback(() => setHover(null), []);

  const ghostRect = ghostRectFor({ hover, shift, move, visibleCount, columnCount, cellRect });

  return { ghostRect, onCellEnter, onHeaderEnter, onLeave };
}

function ghostRectFor({
  hover,
  shift,
  move,
  visibleCount,
  columnCount,
  cellRect,
}: {
  hover: GhostHover;
  shift: boolean;
  move: boolean;
  visibleCount: number;
  columnCount: number;
  cellRect: CellRect | null;
}): CellRect | null {
  if (move || hover === null || visibleCount === 0) {
    return null;
  }
  if (hover.kind === "header") {
    return { top: 0, bottom: visibleCount - 1, left: hover.col, right: hover.col };
  }
  if (shift) {
    return { top: hover.pos, bottom: hover.pos, left: 0, right: columnCount - 1 };
  }
  const inSelection =
    cellRect !== null &&
    hover.pos >= cellRect.top &&
    hover.pos <= cellRect.bottom &&
    hover.col >= cellRect.left &&
    hover.col <= cellRect.right;
  if (inSelection) {
    return null;
  }
  return { top: hover.pos, bottom: hover.pos, left: hover.col, right: hover.col };
}
