import { stringifyValue } from "../canvas/nodes/Result/stringify";
import type { DatabaseResult } from "../state";
import { MAX_SEARCHED_ROWS } from "./searchCorpus";

export interface CellPreview {
  column: string;
  value: string;
  /** Present only for cells that contain a query term, marking the hit to highlight. */
  match?: { start: number; end: number };
}

export interface RowMatch {
  rowIndex: number;
  cells: CellPreview[];
}

export const MAX_MATCH_ROWS = 3;

// Substring (not fuzzy) match of any query term against a result's cells, capped at
// MAX_SEARCHED_ROWS/MAX_MATCH_ROWS. Every column of a matching row is returned so the
// fold-out can render the whole row; matching cells carry their highlight range. Shared
// by the fold-out (which renders the rows) and page search (which uses a non-empty result
// as the gate for putting a result node into find mode) so both agree on "matching data".
export function findRowMatches(rows: DatabaseResult, query: string): RowMatch[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }
  const rowMatches: RowMatch[] = [];
  for (const [rowIndex, row] of rows.slice(0, MAX_SEARCHED_ROWS).entries()) {
    let matched = false;
    const cells = row.map(([column, value]): CellPreview => {
      const text = stringifyValue(value);
      const lower = text.toLowerCase();
      const term = terms.find(t => lower.includes(t));
      if (term === undefined) {
        return { column, value: text };
      }
      matched = true;
      const start = lower.indexOf(term);
      return { column, value: text, match: { start, end: start + term.length } };
    });
    if (!matched) {
      continue;
    }
    rowMatches.push({ rowIndex, cells });
    if (rowMatches.length === MAX_MATCH_ROWS) {
      return rowMatches;
    }
  }
  return rowMatches;
}
