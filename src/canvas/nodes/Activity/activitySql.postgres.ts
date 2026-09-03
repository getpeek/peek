import { invoke } from "@tauri-apps/api/core";
import type { DatabaseResult } from "../../../state";
import { safeSeconds, type ActivityEngine } from "./activitySql";

// Deliberately no `state <> 'idle'` and no `query_start IS NOT NULL`: the engine can
// report a null query_start for a backend that is genuinely running, and filtering on
// either would hide real work. Rows with no query_start show an unknown duration rather
// than a fabricated one. `state IS NOT NULL` only drops idle infrastructure processes
// (checkpointer, walwriter, io workers) that never run a statement.
//
// `get_results` takes a raw string rather than bound parameters, so the only
// untrusted-looking value here is floored to an integer before interpolation.
function pollSql(minSecs: number): string {
  return `SELECT
  a.pid,
  a.usename,
  a.datname,
  a.application_name,
  a.state,
  a.backend_type,
  a.wait_event_type,
  a.wait_event,
  EXTRACT(EPOCH FROM (NOW() - a.query_start)) * 1000 AS duration_ms,
  (pg_blocking_pids(a.pid))[1] AS blocked_by,
  pg_backend_pid() AS self_pid,
  a.query
FROM pg_stat_activity a
WHERE a.state IS NOT NULL
  AND a.pid <> pg_backend_pid()
  AND (a.query_start IS NULL OR NOW() - a.query_start > make_interval(secs => ${safeSeconds(minSecs)}))
ORDER BY duration_ms DESC NULLS LAST`;
}

// The node's own query keeps `duration_ms` for arithmetic; the query node spawned by
// "show source query" is meant to be read, so it shows the interval instead. `min_secs`
// stays an inline literal rather than an `@variable` — an unbound variable would make
// the spawned node fail to run.
function sourceQuerySql(minSecs: number): string {
  return `-- min_secs: hide backends younger than this
SELECT
  pid,
  usename,
  datname,
  application_name,
  state,
  backend_type,
  wait_event_type || ':' || wait_event AS waiting_on,
  (pg_blocking_pids(pid))[1] AS blocked_by,
  NOW() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state IS NOT NULL
  AND pid <> pg_backend_pid()
  AND (query_start IS NULL OR NOW() - query_start > make_interval(secs => ${safeSeconds(minSecs)}))
ORDER BY duration DESC NULLS LAST`;
}

async function kill(pid: number): Promise<boolean> {
  const response = await invoke<string>("get_results", {
    query: `SELECT pg_terminate_backend(${pid})`,
  });
  const result = JSON.parse(response) as DatabaseResult;
  // The driver maps Postgres BOOL to a real JSON boolean. Postgres returns false
  // (with a warning, not an error) when it won't or can't terminate — most often a
  // permissions problem, since a vanished pid is caught before we get here.
  return result[0]?.[0]?.[1] === true;
}

export const postgresActivity: ActivityEngine = {
  sourceName: "pg_stat_activity",
  paletteDescription: "Live pg_stat_activity",
  pollSql,
  sourceQuerySql,
  killLabel: pid => `pg_terminate_backend(${pid})`,
  kill,
};
