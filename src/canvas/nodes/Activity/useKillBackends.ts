import { useCallback, useEffect, useRef, useState } from "react";
import type { Engine } from "../../../Connection/engine";
import { killBackend } from "./killBackend";

/** How long a terminated row stays visible before it leaves the list. */
const LINGER_MS = 2400;

export type KillState =
  | { phase: "terminating" }
  | { phase: "terminated" }
  | { phase: "failed"; message: string }
  | { phase: "skipped"; message: string };

export interface KillRequest {
  pids: number[];
  selfPid: number | null;
  presentPids: ReadonlySet<number>;
  engine: Engine;
}

export interface KillBackends {
  /** Keyed by pid; a row with no entry is behaving normally. */
  states: Record<number, KillState>;
  /** Pids whose linger has elapsed — the row is gone even if the poll still lists it. */
  removedPids: ReadonlySet<number>;
  kill: (args: KillRequest) => void;
  /** Forgets pids the server no longer reports, so a recycled pid starts clean. */
  prune: (presentPids: ReadonlySet<number>) => void;
}

export function useKillBackends(): KillBackends {
  const [states, setStates] = useState<Record<number, KillState>>({});
  const [removedPids, setRemovedPids] = useState<ReadonlySet<number>>(() => new Set());
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const handle of timers.current) {
        window.clearTimeout(handle);
      }
    },
    [],
  );

  const kill = useCallback(({ pids, selfPid, presentPids, engine }: KillRequest) => {
    setStates(prev => {
      const next = { ...prev };
      for (const pid of pids) {
        next[pid] = { phase: "terminating" };
      }
      return next;
    });

    for (const pid of pids) {
      void killBackend({ pid, selfPid, presentPids, engine }).then(outcome => {
        if (outcome.status === "terminated") {
          setStates(prev => ({ ...prev, [pid]: { phase: "terminated" } }));
          timers.current.push(
            window.setTimeout(() => {
              setRemovedPids(prev => new Set(prev).add(pid));
            }, LINGER_MS),
          );
          return;
        }
        setStates(prev => ({
          ...prev,
          [pid]: { phase: outcome.status, message: outcome.message },
        }));
      });
    }
  }, []);

  // Servers recycle ids. Once a terminated row has left the list, drop its
  // state so a later backend reusing that pid isn't hidden by this one's history.
  const prune = useCallback((presentPids: ReadonlySet<number>) => {
    setRemovedPids(prev => {
      const stale = [...prev].filter(pid => !presentPids.has(pid));
      if (stale.length === 0) {
        return prev;
      }
      const next = new Set(prev);
      for (const pid of stale) {
        next.delete(pid);
      }
      setStates(current => {
        const remaining = { ...current };
        for (const pid of stale) {
          delete remaining[pid];
        }
        return remaining;
      });
      return next;
    });
  }, []);

  return { states, removedPids, kill, prune };
}
