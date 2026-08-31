import { formatPreservingVars } from "../../variables";

// Postgres reports non-statement text for some backends: `<insufficient privilege>`
// when the query isn't visible to this role, and `autovacuum: VACUUM public.t` for
// maintenance workers. The formatter mangles both — it spaces out the angle brackets
// and breaks `autovacuum:` onto its own line — so they pass through untouched.
const NON_STATEMENT = /^\s*(<|\w+:)/u;

// Formatting is pure and the same statement recurs on every poll, so results are
// cached by source text. Bounded because a busy server shows many distinct queries.
const MAX_CACHED = 500;
const cache = new Map<string, string>();

/**
 * Reformats a backend's query for reading. `pg_stat_activity` returns whatever the
 * client sent, which is usually one unbroken line. Uses the same formatter and
 * options as the query node's format action, so a statement looks the same here as
 * it would once pasted into a query node.
 */
export function formatActivityQuery(query: string): string {
  if (query === "" || NON_STATEMENT.test(query)) {
    return query;
  }

  const cached = cache.get(query);
  if (cached !== undefined) {
    return cached;
  }

  let formatted: string;
  try {
    formatted = formatPreservingVars(query, {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });
  } catch {
    // Postgres truncates `query` at track_activity_query_size, so a statement can
    // arrive cut mid-token. Showing it unformatted beats showing nothing.
    formatted = query;
  }

  if (cache.size >= MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(query, formatted);
  return formatted;
}
