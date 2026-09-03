import type { Engine } from "../../../Connection/engine";
import { activityEngineFor } from "./activitySql";

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
  engine: Engine;
}

export async function killBackend({
  pid,
  selfPid,
  presentPids,
  engine,
}: KillArgs): Promise<KillOutcome> {
  if (pid === selfPid) {
    return { status: "skipped", message: "that's Peek's own backend" };
  }
  // A backend can finish between the poll that listed it and this click.
  if (!presentPids.has(pid)) {
    return { status: "skipped", message: "backend already gone" };
  }

  try {
    const terminated = await activityEngineFor(engine).kill(pid);
    if (terminated) {
      return { status: "terminated" };
    }
    return { status: "failed", message: "could not terminate" };
  } catch (e) {
    return { status: "failed", message: `${e}` };
  }
}
