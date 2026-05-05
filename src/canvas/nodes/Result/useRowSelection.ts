import { useCallback, useEffect, useRef, useState } from "react";
import type { DatabaseResult } from "../../../state";

type DragState = {
  anchor: number;
  baseline: ReadonlySet<number>;
  prevUserSelect: string;
};

export function useRowSelection(data: DatabaseResult) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setSelected(new Set());
  }, [data]);

  const isSelected = useCallback((idx: number) => selected.has(idx), [selected]);

  const clear = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    if (selected.size === 0) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clear();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected.size, clear]);

  const onSelectMouseDown = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();

      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";

      // Snapshot current selection so the in-flight range is computed against
      // a stable baseline; toggling on click vs. dragging share this state.
      const baseline = new Set(selected);
      dragRef.current = { anchor: rowIndex, baseline, prevUserSelect };

      let moved = false;
      let lastTarget = rowIndex;

      const rowFromPoint = (x: number, y: number): number | null => {
        const tr = document.elementFromPoint(x, y)?.closest("tr[data-index]");
        if (!tr) {
          return null;
        }
        const raw = (tr as HTMLElement).dataset.index;
        if (!raw) {
          return null;
        }
        const idx = Number(raw);
        return Number.isFinite(idx) ? idx : null;
      };

      const applyRange = (current: number) => {
        const drag = dragRef.current;
        if (!drag) {
          return;
        }
        const lo = Math.min(drag.anchor, current);
        const hi = Math.max(drag.anchor, current);
        const next = new Set(drag.baseline);
        for (let i = lo; i <= hi; i++) {
          next.add(i);
        }
        setSelected(next);
      };

      const onMove = (ev: MouseEvent) => {
        const idx = rowFromPoint(ev.clientX, ev.clientY);
        if (idx === null || idx === lastTarget) {
          return;
        }
        moved = true;
        lastTarget = idx;
        applyRange(idx);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag) {
          document.body.style.userSelect = drag.prevUserSelect;
        }
        if (!moved) {
          // Pure modifier-click (no drag): toggle anchor row in/out of the baseline.
          setSelected(() => {
            const next = new Set(baseline);
            if (next.has(rowIndex)) {
              next.delete(rowIndex);
            } else {
              next.add(rowIndex);
            }
            return next;
          });
        }
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [selected],
  );

  return {
    selected,
    isSelected,
    count: selected.size,
    onSelectMouseDown,
    clear,
  };
}
