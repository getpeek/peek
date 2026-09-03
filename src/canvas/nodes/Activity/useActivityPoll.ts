import { invoke } from "@tauri-apps/api/core";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { DatabaseResult } from "../../../state";
import { activeEngineAtom } from "../../../Connection/engine";
import { sessionStateAtom } from "../../../multiplayer/state";
import { activityEngineFor } from "./activitySql";
import { parseActivity, type ActivityRow } from "./activityRow";

export const POLL_MS = 1000;

interface UseActivityPollArgs {
  live: boolean;
  minSecs: number;
  /** Polling pauses while this element is off-screen. */
  rootRef: RefObject<HTMLElement | null>;
}

export interface ActivityPoll {
  rows: ActivityRow[];
  selfPid: number | null;
  error: string | null;
  /** `performance.now()` at the last successful poll, the base for local duration ticking. */
  receivedAt: number;
  refresh: () => void;
}

export function useActivityPoll({ live, minSecs, rootRef }: UseActivityPollArgs): ActivityPoll {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [selfPid, setSelfPid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => performance.now());
  const session = useAtomValue(sessionStateAtom);
  const engine = useAtomValue(activeEngineAtom);
  const inFlightRef = useRef(false);
  const onScreenRef = useRef(true);

  const poll = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    try {
      const response = await invoke<string>("get_results", {
        query: activityEngineFor(engine).pollSql(minSecs),
      });
      const parsed = parseActivity(JSON.parse(response) as DatabaseResult);
      setRows(parsed.rows);
      setSelfPid(parsed.selfPid);
      setReceivedAt(performance.now());
      setError(null);
    } catch (e) {
      setError(`${e}`);
    } finally {
      inFlightRef.current = false;
    }
  }, [minSecs, engine]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const observer = new IntersectionObserver(entries => {
      onScreenRef.current = entries.some(entry => entry.isIntersecting);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [rootRef]);

  // The tick body lives in a ref so the interval below only tears down when `live`
  // changes. Depending on `poll` directly would restart the timer on every render
  // that changes `minSecs`-adjacent state, firing back-to-back polls.
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (document.hidden || !onScreenRef.current) {
        return;
      }
      // Joiners have no connection of their own; the host owns this view.
      if (session?.role === "joiner") {
        return;
      }
      void poll();
    };
  });

  useEffect(() => {
    if (!live) {
      return;
    }
    const tick = () => tickRef.current();
    tick();
    const handle = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(handle);
  }, [live]);

  const refresh = useCallback(() => {
    setReceivedAt(performance.now());
    void poll();
  }, [poll]);

  return { rows, selfPid, error, receivedAt, refresh };
}
