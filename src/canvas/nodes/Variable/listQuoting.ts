// A list variable is inlined into the query as `lines.join(", ")`, so every line
// lands in the SQL verbatim. Anything that isn't a short numeric literal has to
// carry its own quotes or the statement won't parse — `IN (alice, bob)` is a
// syntax error, and the user only finds out once the query has run.

const NUMERIC_RE = /^-?\d+(\.\d+)?$/u;
// Past this, a run of digits is far more likely an id or code stored as text
// than a number the database will accept bare.
const MAX_NUMERIC_LENGTH = 8;

function isQuoted(trimmed: string): boolean {
  return trimmed.startsWith("'");
}

export function needsQuoting(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === "" || isQuoted(trimmed)) {
    return false;
  }
  return !NUMERIC_RE.test(trimmed) || trimmed.length > MAX_NUMERIC_LENGTH;
}

export function countUnquoted(lines: string[]): number {
  return lines.filter(line => needsQuoting(line)).length;
}

export function quoteLine(line: string): string {
  const trimmed = line.trim();
  if (trimmed === "" || isQuoted(trimmed)) {
    return line;
  }
  return `'${trimmed.replaceAll("'", "''")}'`;
}

// Quotes every unquoted line, not only the flagged ones, so the list stays
// homogeneous — a half-quoted IN list is a trap for whoever edits it next.
export function quoteAllLines(lines: string[]): string[] {
  return lines.map(line => quoteLine(line));
}
