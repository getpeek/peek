import { NodeProps, NodeResizer } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { activeEngineAtom } from "../../../Connection/engine";
import { activeConnectionAtom } from "../../../Connection/state";
import { parseConnectionUrl } from "../../../Connection/urlParts";
import { useCanvas } from "../../hooks/useCanvas";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import type { ActivityData, ActivityNode as ActivityNodeT, QueryNode } from "../../types";
import { ActivityFooter } from "./ActivityFooter";
import { ActivityRowView } from "./ActivityRowView";
import { ActivityToolbar } from "./ActivityToolbar";
import { matchesFilter } from "./activityRow";
import { activityEngineFor } from "./activitySql";
import { useActivityPoll } from "./useActivityPoll";
import { useKillBackends } from "./useKillBackends";
import "./Activity.css";

const DEFAULT_W = 960;
const DEFAULT_H = 520;
const MIN_W = 620;
const MIN_H = 320;

/** Gap between the activity node and the query node "show source query" spawns. */
const SOURCE_NODE_GAP = 50;
const SOURCE_NODE_W = 460;
const SOURCE_NODE_H = 380;

export function ActivityNode({ id, data, selected, width, height }: NodeProps<ActivityNodeT>) {
  const canvas = useCanvas();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [selectedPids, setSelectedPids] = useState<ReadonlySet<number>>(() => new Set());
  const active = useAtomValue(activeConnectionAtom);
  const database = parseConnectionUrl(active?.connection.url ?? "")?.database ?? "";
  const engine = useAtomValue(activeEngineAtom);
  const activity = activityEngineFor(engine);

  useScrollFallthrough(bodyRef);

  const { rows, selfPid, error, receivedAt, refresh } = useActivityPoll({
    live: data.live,
    minSecs: data.minSecs,
    rootRef,
  });
  const { states, removedPids, kill, prune } = useKillBackends();

  // Durations advance off this tick rather than off each poll, so they never
  // visibly step when a poll is slow. Pausing stops it, freezing the numbers.
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!data.live) {
      return;
    }
    const handle = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(handle);
  }, [data.live]);

  const elapsed = Math.max(0, now - receivedAt);
  const visible = rows.filter(row => !removedPids.has(row.pid) && matchesFilter(row, data.filter));
  const presentPids = new Set(rows.map(row => row.pid));

  useEffect(() => {
    prune(presentPids);
    // `presentPids` is rebuilt every render; the pid list is what actually matters.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, prune]);

  const update = (patch: Partial<ActivityData>) => {
    canvas.updateNodeData<ActivityData>(id, patch);
  };

  const toggleSelected = (pid: number) => {
    setSelectedPids(prev => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

  const killPids = (pids: number[]) => {
    kill({ pids, selfPid, presentPids, engine });
    setSelectedPids(new Set());
  };

  const showSourceQuery = () => {
    const node = canvas.getNode(id);
    if (!node) {
      return;
    }
    const sourceId = `${id}-source`;
    const query = activity.sourceQuerySql(data.minSecs);
    const existing = canvas.getNode(sourceId);
    if (existing) {
      canvas.updateNodeData<QueryNode["data"]>(sourceId, { query });
    } else {
      const sourceNode: QueryNode = {
        id: sourceId,
        type: "query",
        position: {
          x: node.position.x - SOURCE_NODE_W - SOURCE_NODE_GAP,
          y: node.position.y,
        },
        width: SOURCE_NODE_W,
        height: SOURCE_NODE_H,
        data: { query },
      };
      canvas.addNode(sourceNode);
      canvas.connect(sourceId, id);
    }
    canvas.selectOnly(sourceId);
    canvas.zoomToNode(sourceId, { duration: 200 });
  };

  return (
    <>
      <NodeResizer minWidth={MIN_W} minHeight={MIN_H} />
      <HiddenHandles connectableTarget />
      <div
        className={`app-node ${selected ? "selected" : ""}`}
        style={{ width: width ?? DEFAULT_W, height: height ?? DEFAULT_H }}
        ref={rootRef}
      >
        <NodeHeader
          nodeId={id}
          name={`running queries · ${database}`}
          indicator={<NodeIndicator kind='activity' />}
        />

        <div className='app-node-body nodrag' ref={bodyRef}>
          <ActivityToolbar
            rows={rows.filter(row => !removedPids.has(row.pid))}
            filter={data.filter}
            live={data.live}
            onFilterChange={filter => update({ filter })}
            onToggleLive={() => update({ live: !data.live })}
            onRefresh={refresh}
          />

          <div className='activity-scroll'>
            {error && <div className='activity-error'>{error}</div>}
            {!error && visible.length === 0 && (
              <div className='activity-empty'>No backends match this filter.</div>
            )}
            {visible.map(row => (
              <ActivityRowView
                key={row.pid}
                row={row}
                displayedMs={row.durationMs === null ? null : row.durationMs + elapsed}
                selected={selectedPids.has(row.pid)}
                killState={states[row.pid]}
                killLabel={activity.killLabel(row.pid)}
                onToggleSelect={() => toggleSelected(row.pid)}
                onKill={() => killPids([row.pid])}
              />
            ))}
          </div>
        </div>

        <ActivityFooter
          sourceName={activity.sourceName}
          database={database}
          refreshedAgoSecs={Math.floor(elapsed / 1000)}
          selectedCount={selectedPids.size}
          onShowSourceQuery={showSourceQuery}
          onKillSelected={() => killPids([...selectedPids])}
          onClearSelection={() => setSelectedPids(new Set())}
        />
      </div>
    </>
  );
}
