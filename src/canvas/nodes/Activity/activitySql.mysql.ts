import { invoke } from "@tauri-apps/api/core";
import { safeSeconds, type ActivityEngine } from "./activitySql";

// Columns are aliased to the pg_stat_activity names and `state` is normalised to
// active / idle / idle in transaction, so `isIdleInTransaction` and the "active"
// filter work unchanged. `MIN(blocking_pid)` mirrors `(pg_blocking_pids(pid))[1]`.
// `sys.innodb_lock_waits` needs the PROCESS privilege and MySQL ≥ 5.7 / MariaDB ≥ 10.6.
//
// `get_results` takes a raw string rather than bound parameters, so the only
// untrusted-looking value here is floored to an integer before interpolation.
function pollSql(minSecs: number): string {
  return `SELECT
  p.ID AS pid,
  p.USER AS usename,
  p.DB AS datname,
  COALESCE(attr.ATTR_VALUE, '') AS application_name,
  CASE
    WHEN p.COMMAND = 'Sleep' AND trx.trx_mysql_thread_id IS NOT NULL THEN 'idle in transaction'
    WHEN p.COMMAND = 'Sleep' THEN 'idle'
    ELSE 'active'
  END AS state,
  NULL AS backend_type,
  CASE WHEN p.COMMAND = 'Sleep' THEN NULL ELSE p.COMMAND END AS wait_event_type,
  CASE WHEN p.COMMAND = 'Sleep' THEN NULL ELSE p.STATE END AS wait_event,
  p.TIME * 1000 AS duration_ms,
  lw.blocking_pid AS blocked_by,
  CONNECTION_ID() AS self_pid,
  COALESCE(p.INFO, '') AS query
FROM information_schema.PROCESSLIST p
LEFT JOIN information_schema.INNODB_TRX trx ON trx.trx_mysql_thread_id = p.ID
LEFT JOIN (
  SELECT waiting_pid, MIN(blocking_pid) AS blocking_pid
  FROM sys.innodb_lock_waits GROUP BY waiting_pid
) lw ON lw.waiting_pid = p.ID
LEFT JOIN performance_schema.session_connect_attrs attr
  ON attr.PROCESSLIST_ID = p.ID AND attr.ATTR_NAME = 'program_name'
WHERE p.ID <> CONNECTION_ID()
  AND p.COMMAND <> 'Daemon'
  AND p.TIME >= ${safeSeconds(minSecs)}
ORDER BY duration_ms DESC`;
}

// Readable variant for "show source query"; see the Postgres sibling for why
// `min_secs` is an inline literal rather than an `@variable`.
function sourceQuerySql(minSecs: number): string {
  return `-- min_secs: hide connections younger than this
SELECT
  p.ID AS pid,
  p.USER AS username,
  p.HOST AS host,
  p.DB AS db,
  p.COMMAND AS command,
  p.STATE AS state,
  trx.trx_state,
  lw.blocking_pid AS blocked_by,
  SEC_TO_TIME(p.TIME) AS duration,
  p.INFO AS query
FROM information_schema.PROCESSLIST p
LEFT JOIN information_schema.INNODB_TRX trx ON trx.trx_mysql_thread_id = p.ID
LEFT JOIN (
  SELECT waiting_pid, MIN(blocking_pid) AS blocking_pid
  FROM sys.innodb_lock_waits GROUP BY waiting_pid
) lw ON lw.waiting_pid = p.ID
WHERE p.ID <> CONNECTION_ID()
  AND p.COMMAND <> 'Daemon'
  AND p.TIME >= ${safeSeconds(minSecs)}
ORDER BY p.TIME DESC`;
}

// `KILL <id>` (the connection) rather than `KILL QUERY`: the linger/removedPids flow
// assumes the row leaves the next poll, and KILL QUERY does nothing for a connection
// that is idle in transaction. MySQL raises an error (1094 no such thread, 1095 not
// owner) instead of returning false, so a resolved call means it was killed.
async function kill(pid: number): Promise<boolean> {
  await invoke("execute_statement", { query: `KILL ${pid}` });
  return true;
}

export const mysqlActivity: ActivityEngine = {
  sourceName: "processlist",
  paletteDescription: "Live processlist",
  pollSql,
  sourceQuerySql,
  killLabel: pid => `KILL ${pid}`,
  kill,
};
