import { useAtomValue } from "jotai";
import { formatPreservingVars } from "../canvas/variables";
import { resultRowsAtom } from "../canvas/state";
import { type NodeSearchEntry } from "./searchCorpus";
import { type CellMatch, findCellMatches } from "./cellMatches";
import { SqlPreview } from "./SqlPreview";

// How much of a long cell value to keep around the highlighted range.
const WINDOW_BEFORE = 24;
const WINDOW_AFTER = 60;

const MatchedCell = ({ match }: { match: CellMatch }) => {
  const windowStart = Math.max(0, match.start - WINDOW_BEFORE);
  const windowEnd = Math.min(match.value.length, match.end + WINDOW_AFTER);
  return (
    <div className='page-search-strip-cell'>
      <span className='cell-column'>{match.column}</span>
      <span className='cell-value'>
        {windowStart > 0 && "…"}
        {match.value.slice(windowStart, match.start)}
        <mark className='match'>{match.value.slice(match.start, match.end)}</mark>
        {match.value.slice(match.end, windowEnd)}
        {windowEnd < match.value.length && "…"}
      </span>
      <span className='cell-row'>row {match.rowIndex + 1}</span>
    </div>
  );
};

const PrettySql = ({ sql }: { sql: string }) => {
  let pretty = sql;
  try {
    pretty = formatPreservingVars(sql, {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });
  } catch {}
  return <SqlPreview sql={pretty} />;
};

const ResultMatches = ({ entry, query }: { entry: NodeSearchEntry; query: string }) => {
  const rows = useAtomValue(resultRowsAtom(entry.id));
  const matches = findCellMatches(rows, query);

  if (matches.length === 0) {
    return entry.sql === undefined ? null : <PrettySql sql={entry.sql} />;
  }
  return matches.map((match, i) => <MatchedCell key={i} match={match} />);
};

// Fold-out under the active row, like the command palette's details strip: query
// nodes preview their pretty-printed SQL; result nodes show the cells the query
// actually hit (falling back to SQL when the match came from elsewhere, e.g. a
// fuzzy or column-name hit).
export const PageSearchDetails = ({ entry, query }: { entry: NodeSearchEntry; query: string }) => {
  if (entry.type === "result") {
    return (
      <div className='page-search-strip'>
        <ResultMatches entry={entry} query={query} />
      </div>
    );
  }
  if (entry.sql === undefined) {
    return null;
  }
  return (
    <div className='page-search-strip'>
      <PrettySql sql={entry.sql} />
    </div>
  );
};
