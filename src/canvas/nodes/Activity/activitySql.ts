import type { Engine } from "../../../Connection/engine";
import { mysqlActivity } from "./activitySql.mysql";
import { postgresActivity } from "./activitySql.postgres";

/** Severity thresholds, in ms, shared by the duration colour and the row's left tick. */
export const WARN_MS = 60_000;
export const DANGER_MS = 300_000;

/** A full progress bar means "running this long is certainly a problem". */
export const BAR_FULL_MS = 900_000;

export function safeSeconds(minSecs: number): number {
  return Number.isFinite(minSecs) ? Math.max(0, Math.floor(minSecs)) : 0;
}

/**
 * Everything about the activity node that differs between engines. Both dialects
 * alias their columns into the one row shape `activityRow.ts` parses, so the rest of
 * the node never branches on the engine.
 */
export interface ActivityEngine {
  /** Footer label: "pg_stat_activity" | "processlist". */
  sourceName: string;
  paletteDescription: string;
  pollSql(minSecs: number): string;
  sourceQuerySql(minSecs: number): string;
  killLabel(pid: number): string;
  /** Resolves true when the server confirmed termination; throws on driver/permission errors. */
  kill(pid: number): Promise<boolean>;
}

export function activityEngineFor(engine: Engine): ActivityEngine {
  return engine === "mysql" ? mysqlActivity : postgresActivity;
}
