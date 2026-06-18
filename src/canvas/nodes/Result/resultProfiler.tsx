import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

// Dev-only render profiler for result tables. Wraps each result table's subtree
// in a React <Profiler> and tallies how often — and how expensively — it
// commits. Drive it from the browser console:
//
//   __peekProfile.start()   // begin recording
//   …interact (drag a node, scroll the table, type in a cell)…
//   __peekProfile.dump()    // console.table of per-node stats
//   __peekProfile.stop(); __peekProfile.reset()
//
// `mounts` vs `updates` separates "new rows scrolled in" from "re-rendered in
// place"; a low `updates` count while dragging an unrelated node is the win
// we're after. Stripped entirely from production builds (`import.meta.env.DEV`).

type Stat = {
  mounts: number;
  updates: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
};

const stats = new Map<string, Stat>();
let isRecording = false;

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (!isRecording) {
    return;
  }
  const stat = stats.get(id) ?? { mounts: 0, updates: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
  if (phase === "mount") {
    stat.mounts += 1;
  } else {
    stat.updates += 1;
  }
  stat.totalMs += actualDuration;
  stat.maxMs = Math.max(stat.maxMs, actualDuration);
  stat.lastMs = actualDuration;
  stats.set(id, stat);
};

const round = (ms: number) => Number(ms.toFixed(2));

function summary() {
  return [...stats.entries()]
    .map(([id, s]) => ({
      id,
      commits: s.mounts + s.updates,
      mounts: s.mounts,
      updates: s.updates,
      avgMs: round(s.totalMs / Math.max(1, s.mounts + s.updates)),
      maxMs: round(s.maxMs),
      lastMs: round(s.lastMs),
      totalMs: round(s.totalMs),
    }))
    .toSorted((a, b) => b.totalMs - a.totalMs);
}

type ProfileApi = {
  start: () => void;
  stop: () => void;
  reset: () => void;
  dump: () => void;
  isRecording: () => boolean;
};

const api: ProfileApi = {
  start: () => {
    stats.clear();
    isRecording = true;
    console.info("[peek-profile] recording — interact, then __peekProfile.dump()");
  },
  stop: () => {
    isRecording = false;
    console.info("[peek-profile] stopped");
  },
  reset: () => {
    stats.clear();
    console.info("[peek-profile] cleared");
  },
  dump: () => console.table(summary()),
  isRecording: () => isRecording,
};

const isDev = import.meta.env.DEV;

// String key avoids a dangling-underscore identifier; the global is still
// reachable as `__peekProfile` from the console.
const PROFILE_GLOBAL = "__peekProfile";

if (isDev && typeof window !== "undefined") {
  (window as unknown as Record<string, ProfileApi>)[PROFILE_GLOBAL] = api;
}

export function ResultRenderProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (!isDev) {
    return <>{children}</>;
  }
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
