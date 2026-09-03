import { atom, getDefaultStore } from "jotai";
import type { FormatOptionsWithLanguage } from "sql-formatter";
import { hostEngineAtom, sessionStateAtom } from "../multiplayer/state";
import { activeConnectionAtom } from "./state";

export type Engine = "postgresql" | "mysql" | "unknown";

// Only the URL scheme is inspected — the URL (with credentials) never leaves the
// frontend, so this is safe to expose to agents and guests.
export function engineFromUrl(url: string): Engine {
  const scheme = url.split("://", 1)[0]?.toLowerCase();
  if (scheme === "postgres" || scheme === "postgresql") {
    return "postgresql";
  }
  if (scheme === "mysql" || scheme === "mariadb") {
    return "mysql";
  }
  return "unknown";
}

export function isEngine(value: unknown): value is Engine {
  return value === "postgresql" || value === "mysql" || value === "unknown";
}

// Joiners have no connection of their own; every statement they build runs on the
// host, so they must speak the host's dialect.
export const activeEngineAtom = atom<Engine>(get => {
  if (get(sessionStateAtom)?.role === "joiner") {
    return get(hostEngineAtom);
  }
  const active = get(activeConnectionAtom);
  return active ? engineFromUrl(active.connection.url) : "unknown";
});

export function getActiveEngine(): Engine {
  return getDefaultStore().get(activeEngineAtom);
}

export function formatterLanguage(engine: Engine): FormatOptionsWithLanguage["language"] {
  switch (engine) {
    case "postgresql":
      return "postgresql";
    case "mysql":
      return "mysql";
    case "unknown":
      return "sql";
  }
}

export function dialectName(engine: Engine): string {
  switch (engine) {
    case "postgresql":
      return "PostgreSQL";
    case "mysql":
      return "MySQL";
    case "unknown":
      return "standard SQL";
  }
}

export function quoteIdentifier(engine: Engine, name: string): string {
  if (engine === "mysql") {
    return `\`${name.replaceAll("`", "``")}\``;
  }
  return `"${name.replaceAll('"', '""')}"`;
}
