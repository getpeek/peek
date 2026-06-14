import { useMemo } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import fuzzysort from "fuzzysort";
import type { DatabaseResult } from "../../../state";
import { stringifyValue } from "./stringify";

/** Minimum fuzzysort score (0–1) a cell must clear to count as a match. */
const MATCH_THRESHOLD = 0.5;

export type SearchMatches = {
  /** Original row indices (into `data`) that contain at least one matching cell. */
  visibleIndices: number[];
  /** Original row index → matched column index → the fuzzysort result for that cell. */
  matchedCols: Map<number, Map<number, Fuzzysort.Result>>;
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
    const matchedCols = new Map<number, Map<number, Fuzzysort.Result>>();
    const rowScores = new Map<number, number>();

    prepared.forEach((row, rowIndex) => {
      const cols = new Map<number, Fuzzysort.Result>();
      let bestScore = 0;
      row.forEach((cell, columnIdx) => {
        const result = fuzzysort.single(trimmed, cell);
        // fuzzysort scores 1 = perfect, 0.5 = good, 0 = none. Below the threshold the
        // match is loose enough to be noise, so the cell neither shows nor highlights.
        if (result && result.score >= MATCH_THRESHOLD) {
          cols.set(columnIdx, result);
          bestScore = Math.max(bestScore, result.score);
        }
      });
      if (cols.size > 0) {
        visibleIndices.push(rowIndex);
        matchedCols.set(rowIndex, cols);
        rowScores.set(rowIndex, bestScore);
      }
    });

    // Strongest match first; Array.sort is stable, so equal scores keep original order.
    visibleIndices.sort((a, b) => (rowScores.get(b) ?? 0) - (rowScores.get(a) ?? 0));

    return { visibleIndices, matchedCols, isSearching: true };
  }, [prepared, debouncedQuery, active, data.length]);
}
