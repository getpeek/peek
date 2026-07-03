import { useEffect } from "react";
import type { DatabaseResult } from "../../../../state";
import { stringifyValue } from "../stringify";

/** Tab-separated cell values, rows on newlines — pastes cleanly into spreadsheets. */
function toTsvValues(rows: DatabaseResult): string {
  return rows.map(row => row.map(cell => stringifyValue(cell[1])).join("\t")).join("\n");
}

function isEditableTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

/**
 * Cmd/Ctrl-C copies the node's active selection: a single cell yields its raw
 * value, a larger cell rect or a row selection yields tab-separated values.
 * `active` gates the listener to nodes that actually have a selection (a
 * drag-select doesn't necessarily mark the node canvas-selected), and native
 * copy still wins inside the inline/JSON editor.
 */
export function useSelectionCopy({
  active,
  data,
  cellGrid,
  selectedRows,
}: {
  active: boolean;
  data: DatabaseResult;
  cellGrid: () => DatabaseResult | null;
  selectedRows: ReadonlySet<number>;
}) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "c" || isEditableTarget(document.activeElement)) {
        return;
      }
      const grid = cellGrid();
      const rows =
        grid ??
        [...selectedRows]
          .toSorted((a, b) => a - b)
          .map(i => data[i])
          .filter(Boolean);
      if (rows.length === 0) {
        return;
      }
      e.preventDefault();
      void navigator.clipboard.writeText(toTsvValues(rows));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, data, cellGrid, selectedRows]);
}
