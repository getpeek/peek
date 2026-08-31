import type { DatabaseResult } from "../../../state";
import { DANGER_MS, WARN_MS } from "./activitySql";
import type { ActivityFilter } from "../../types";

export interface ActivityRow {
  pid: number;
  user: string;
  database: string;
  application: string;
  state: string;
  backendType: string;
  waitingOn: string | null;
  blockedBy: number | null;
  /**
   * Age at the moment of the poll; the UI adds elapsed time on top so it ticks
   * smoothly. Null when the engine reports no query_start — the age is genuinely
   * unknown, and showing zero would read as "just started".
   */
  durationMs: number | null;
  query: string;
}

export type Severity = "neutral" | "warning" | "danger";

export function severityFor(durationMs: number | null): Severity {
  if (durationMs === null) {
    return "neutral";
  }
  if (durationMs >= DANGER_MS) {
    return "danger";
  }
  if (durationMs >= WARN_MS) {
    return "warning";
  }
  return "neutral";
}

export function isIdleInTransaction(row: ActivityRow): boolean {
  return row.state.startsWith("idle in transaction");
}

export function matchesFilter(row: ActivityRow, filter: ActivityFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return row.state === "active";
    case "idle-in-txn":
      return isIdleInTransaction(row);
    case "blocked":
      return row.blockedBy !== null;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

function cellMap(row: [string, unknown, string][]): Map<string, unknown> {
  return new Map(row.map(([column, value]) => [column, value]));
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// `wait_event_type || ':' || wait_event` is done here rather than in SQL because
// `||` returns NULL when either side is, which would silently drop the type.
function waitingOn(cells: Map<string, unknown>): string | null {
  const type = text(cells.get("wait_event_type"));
  const event = text(cells.get("wait_event"));
  if (!type && !event) {
    return null;
  }
  return [type, event].filter(Boolean).join(":");
}

export interface ParsedActivity {
  rows: ActivityRow[];
  selfPid: number | null;
}

export function parseActivity(result: DatabaseResult): ParsedActivity {
  let selfPid: number | null = null;
  const rows: ActivityRow[] = [];

  for (const raw of result) {
    const cells = cellMap(raw);
    const pid = num(cells.get("pid"));
    if (pid === null) {
      continue;
    }
    selfPid ??= num(cells.get("self_pid"));
    rows.push({
      pid,
      user: text(cells.get("usename")),
      database: text(cells.get("datname")),
      application: text(cells.get("application_name")),
      state: text(cells.get("state")),
      backendType: text(cells.get("backend_type")),
      waitingOn: waitingOn(cells),
      blockedBy: num(cells.get("blocked_by")),
      durationMs: num(cells.get("duration_ms")),
      query: text(cells.get("query")),
    });
  }

  return { rows, selfPid };
}
