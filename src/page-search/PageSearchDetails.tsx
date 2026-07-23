import { type ReactNode, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { resultRowsAtom } from "../canvas/state";
import { type NodeSearchEntry } from "./searchCorpus";
import { type CellPreview, findRowMatches } from "./cellMatches";

// How much of a long cell value to keep around the highlighted range.
const WINDOW_BEFORE = 24;
const WINDOW_AFTER = 60;

const cellContent = (cell: CellPreview): ReactNode => {
  if (cell.match === undefined) {
    return cell.value;
  }
  const { start, end } = cell.match;
  const windowStart = Math.max(0, start - WINDOW_BEFORE);
  const windowEnd = Math.min(cell.value.length, end + WINDOW_AFTER);
  return (
    <>
      {windowStart > 0 && "…"}
      {cell.value.slice(windowStart, start)}
      <mark className='match'>{cell.value.slice(start, end)}</mark>
      {cell.value.slice(end, windowEnd)}
      {windowEnd < cell.value.length && "…"}
    </>
  );
};

// Fold-out under the active result row: the matching database rows rendered as an
// actual table (column headers + one row per hit) with the matching text highlighted.
// Renders nothing when the match came from elsewhere (a label or column-name hit).
export const PageSearchDetails = ({ entry, query }: { entry: NodeSearchEntry; query: string }) => {
  const rows = useAtomValue(resultRowsAtom(entry.id));
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const matchRef = useRef<HTMLTableCellElement | null>(null);
  const matches = findRowMatches(rows, query);

  // Bring the first matching column into view without scrollIntoView, which would
  // also yank the outer results list vertically.
  useEffect(() => {
    const scroll = scrollRef.current;
    const cell = matchRef.current;
    if (scroll && cell) {
      scroll.scrollLeft +=
        cell.getBoundingClientRect().left - scroll.getBoundingClientRect().left - 12;
    }
  }, [query]);

  if (matches.length === 0) {
    return null;
  }
  const columns = matches[0].cells.map(cell => cell.column);
  const firstMatchColumn = matches[0].cells.findIndex(cell => cell.match !== undefined);

  return (
    <div className='page-search-strip'>
      <div className='page-search-table-scroll' ref={scrollRef}>
        <table className='page-search-table'>
          <thead>
            <tr>
              <th className='page-search-table-index' />
              {columns.map((column, i) => (
                <th key={i}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((row, rowIndex) => (
              <tr key={row.rowIndex}>
                <td className='page-search-table-index'>{row.rowIndex + 1}</td>
                {row.cells.map((cell, columnIndex) => (
                  <td
                    key={columnIndex}
                    data-match={cell.match === undefined ? undefined : ""}
                    ref={rowIndex === 0 && columnIndex === firstMatchColumn ? matchRef : undefined}
                  >
                    <span className='page-search-cell'>{cellContent(cell)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
