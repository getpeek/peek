import { invoke } from "@tauri-apps/api/core";
import type { DatabaseResult } from "../../../state";

export type KillOutcome =
  | { status: "terminated" }
  | { status: "skipped"; message: string }
  | { status: "failed"; message: string };

interface KillArgs {
  pid: number;
  /** Peek's own backend, which must never be terminated. */
  selfPid: number | null;
  /** Pids seen in the most recent poll. */
  presentPids: ReadonlySet<number>;
}

export async function killBackend({ pid, selfPid, presentPids }: KillArgs): Promise<KillOutcome> {
  if (pid === selfPid) {
    return { status: "skipped", message: "that's Peek's own backend" };
  }
  // A backend can finish between the poll that listed it and this click.
  if (!presentPids.has(pid)) {
    return { status: "skipped", message: "backend already gone" };
  }

  try {
    const response = await invoke<string>("get_results", {
      query: `SELECT pg_terminate_backend(${pid})`,
    });
    const result = JSON.parse(response) as DatabaseResult;
    // The driver maps Postgres BOOL to a real JSON boolean.
    if (result[0]?.[0]?.[1] === true) {
      return { status: "terminated" };
    }
    // Postgres returns false (with a warning, not an error) when it won't or can't
    // terminate — most often a permissions problem, since a vanished pid is caught above.
    return { status: "failed", message: "could not terminate" };
  } catch (e) {
    return { status: "failed", message: `${e}` };
  }
}
