import { useMemo } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import fuzzysort from "fuzzysort";
import type { DatabaseResult } from "../../../state";
import { stringifyValue } from "./stringify";

export type SearchMatches = {
  /** Original row indices (into `data`) that contain at least one matching cell. */
  visibleIndices: number[];
  /** Original row index → set of column indices whose cell matched the query. */
  matchedCols: Map<number, Set<number>>;
  isSearching: boolean;
};

function allVisible(rowCount: number): SearchMatches {
  return {
    visibleIndices: Array.from({ length: rowCount }, (_, index) => index),
    matchedCols: new Map(),
    isSearching: false,
  };
}

/**
 * Fuzzy-matches every cell of `data` against `query`, entirely client-side.
 * Cells are stringified (JSON cells via `stringifyValue`'s `JSON.stringify`) and
 * `fuzzysort.prepare`d once per `data` load — the per-keystroke cost is only the
 * `single` lookups over those prepared strings. The prepared grid is only built
 * while search is `active` so closed result nodes pay nothing.
 */
export function useResultSearchMatches(
  data: DatabaseResult,
  query: string,
  active: boolean,
): SearchMatches {
  const prepared = useMemo(
    () =>
      active
        ? data.map(row => row.map(([, value]) => fuzzysort.prepare(stringifyValue(value))))
        : [],
    [data, active],
  );

  const [debouncedQuery] = useDebouncedValue(query, 100);

  return useMemo(() => {
    const trimmed = active ? debouncedQuery.trim() : "";
    if (!trimmed) {
      return allVisible(data.length);
    }

    const visibleIndices: number[] = [];
    const matchedCols = new Map<number, Set<number>>();

    prepared.forEach((row, rowIndex) => {
      const cols = new Set<number>();
      row.forEach((cell, columnIdx) => {
        if (fuzzysort.single(trimmed, cell)) {
          cols.add(columnIdx);
        }
      });
      if (cols.size > 0) {
        visibleIndices.push(rowIndex);
        matchedCols.set(rowIndex, cols);
      }
    });

    return { visibleIndices, matchedCols, isSearching: true };
  }, [prepared, debouncedQuery, active, data.length]);
}
