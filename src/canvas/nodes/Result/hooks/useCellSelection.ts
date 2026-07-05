import { useCallback, useEffect, useRef, useState } from "react";
import type { DatabaseResult } from "../../../../state";

/**
 * Rectangle in display space: top/bottom are display positions (the row's
 * `data-index`, i.e. indices into visibleIndices), left/right are column
 * indices. All bounds inclusive.
 */
export type CellRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type CellPoint = { pos: number; col: number };

function normalizeRect(a: CellPoint, b: CellPoint): CellRect {
  return {
    top: Math.min(a.pos, b.pos),
    bottom: Math.max(a.pos, b.pos),
    left: Math.min(a.col, b.col),
    right: Math.max(a.col, b.col),
  };
}

function sameRect(a: CellRect | null, b: CellRect): boolean {
  return (
    a !== null &&
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.left === b.left &&
    a.right === b.right
  );
}

export function useCellSelection({
  data,
  visibleIndices,
  onStart,
}: {
  data: DatabaseResult;
  visibleIndices: number[];
  /** Called when a selection gesture begins — the caller clears the row selection here. */
  onStart: () => void;
}) {
  const [rect, setRect] = useState<CellRect | null>(null);
  const anchorRef = useRef<CellPoint | null>(null);

  const clear = useCallback(() => {
    anchorRef.current = null;
    setRect(null);
  }, []);

  // Display positions are only meaningful for the data/ordering they were
  // captured against: search re-sorts visibleIndices by match score, so a
  // stale rect would silently remap onto different rows.
  useEffect(() => {
    clear();
  }, [data, visibleIndices, clear]);

  useEffect(() => {
    if (rect === null) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clear();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [rect, clear]);

  const applyRect = useCallback((next: CellRect) => {
    setRect(current => (sameRect(current, next) ? current : next));
  }, []);

  const onCellMouseDown = useCallback(
    (displayPos: number, colIdx: number, e: React.MouseEvent) => {
      // Plain left-press selects cells; Shift is reserved for row selection.
      if (e.shiftKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      onStart();

      const anchor: CellPoint = { pos: displayPos, col: colIdx };
      anchorRef.current = anchor;
      applyRect(normalizeRect(anchor, anchor));

      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";

      let lastPos = displayPos;
      let lastCol = colIdx;

      const cellFromPoint = (x: number, y: number): CellPoint | null => {
        const td = document.elementFromPoint(x, y)?.closest("td[data-col]");
        const tr = td?.closest("tr[data-index]");
        if (!td || !tr) {
          return null;
        }
        const pos = Number((tr as HTMLElement).dataset.index);
        const col = Number((td as HTMLElement).dataset.col);
        return Number.isFinite(pos) && Number.isFinite(col) ? { pos, col } : null;
      };

      const onMove = (ev: MouseEvent) => {
        const cell = cellFromPoint(ev.clientX, ev.clientY);
        if (!cell || (cell.pos === lastPos && cell.col === lastCol)) {
          return;
        }
        lastPos = cell.pos;
        lastCol = cell.col;
        applyRect(normalizeRect(anchor, cell));
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = prevUserSelect;
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onStart, applyRect],
  );

  const selectColumn = useCallback(
    (colIdx: number) => {
      if (visibleIndices.length === 0) {
        return;
      }
      onStart();
      anchorRef.current = { pos: 0, col: colIdx };
      applyRect({ top: 0, bottom: visibleIndices.length - 1, left: colIdx, right: colIdx });
    },
    [visibleIndices.length, onStart, applyRect],
  );

  const selectedRowIndices = useCallback((): number[] => {
    if (rect === null) {
      return [];
    }
    return visibleIndices.slice(rect.top, rect.bottom + 1);
  }, [rect, visibleIndices]);

  // A rectangular sub-grid is itself a valid DatabaseResult (rows of
  // [column, value, type] tuples), so it flows into copy/export unchanged.
  const selectedGrid = useCallback((): DatabaseResult | null => {
    if (rect === null) {
      return null;
    }
    return visibleIndices
      .slice(rect.top, rect.bottom + 1)
      .map(i => data[i])
      .filter(Boolean)
      .map(row => row.slice(rect.left, rect.right + 1));
  }, [rect, visibleIndices, data]);

  return { rect, onCellMouseDown, selectColumn, selectedRowIndices, selectedGrid, clear };
}
