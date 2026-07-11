import { stringifyValue } from "../canvas/nodes/Result/stringify";
import type { DatabaseResult } from "../state";
import { MAX_SEARCHED_ROWS } from "./searchCorpus";

export interface CellMatch {
  column: string;
  rowIndex: number;
  value: string;
  start: number;
  end: number;
}

export const MAX_CELL_MATCHES = 3;

// Substring (not fuzzy) match of any query term against a result's cells, capped
// at MAX_SEARCHED_ROWS/MAX_CELL_MATCHES. Shared by the fold-out (which renders the
// hits) and page search (which uses a non-empty result as the gate for putting a
// result node into find mode) so both agree on what "matching data" means.
export function findCellMatches(rows: DatabaseResult, query: string): CellMatch[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }
  const matches: CellMatch[] = [];
  for (const [rowIndex, row] of rows.slice(0, MAX_SEARCHED_ROWS).entries()) {
    for (const [column, value] of row) {
      const text = stringifyValue(value);
      const lower = text.toLowerCase();
      const term = terms.find(t => lower.includes(t));
      if (!term) {
        continue;
      }
      const start = lower.indexOf(term);
      matches.push({ column, rowIndex, value: text, start, end: start + term.length });
      if (matches.length === MAX_CELL_MATCHES) {
        return matches;
      }
    }
  }
  return matches;
}
