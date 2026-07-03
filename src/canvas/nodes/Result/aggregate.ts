import { isNumericType } from "./cell/inlineEdit";
import type { CellRect } from "./hooks/useCellSelection";
import type { DatabaseResult } from "../../../state";

export type SelectionAggregates = {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
};

// Postgres NUMERIC (and friends) arrive as strings, so a cell counts as
// numeric when the value is a JS number or a numeric-typed string that parses.
function numericValue(value: unknown, type: string): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || !isNumericType(type)) {
    return null;
  }
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : null;
}

/** Aggregates over the selected sub-grid, or null unless every cell is numeric. */
export function aggregateSelection(
  data: DatabaseResult,
  rect: CellRect,
  visibleIndices: number[],
): SelectionAggregates | null {
  const values: number[] = [];
  for (let pos = rect.top; pos <= rect.bottom; pos++) {
    const row = data[visibleIndices[pos]];
    if (!row) {
      continue;
    }
    for (let col = rect.left; col <= rect.right; col++) {
      const cell = row[col];
      if (!cell) {
        continue;
      }
      const parsed = numericValue(cell[1], cell[2]);
      if (parsed === null) {
        return null;
      }
      values.push(parsed);
    }
  }
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    count: values.length,
    sum,
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
