import { IconRefresh } from "@tabler/icons-react";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import type { ActivityFilter } from "../../types";
import { formatDuration, isIdleInTransaction, type ActivityRow } from "./activityRow";

const FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "idle-in-txn", label: "Idle in txn" },
  { value: "blocked", label: "Blocked" },
];

interface ActivityToolbarProps {
  rows: ActivityRow[];
  filter: ActivityFilter;
  live: boolean;
  onFilterChange: (filter: ActivityFilter) => void;
  onToggleLive: () => void;
  onRefresh: () => void;
}

export function ActivityToolbar({
  rows,
  filter,
  live,
  onFilterChange,
  onToggleLive,
  onRefresh,
}: ActivityToolbarProps) {
  const active = rows.filter(row => row.state === "active").length;
  const idleInTxn = rows.filter(row => isIdleInTransaction(row)).length;
  const blocked = rows.filter(row => row.blockedBy !== null).length;
  const longest = rows.reduce((max, row) => Math.max(max, row.durationMs ?? 0), 0);

  return (
    <div className='app-node-subtoolbar activity-toolbar'>
      <div className='meta'>
        <button
          className={`activity-live ${live ? "is-live" : "is-paused"}`}
          onClick={onToggleLive}
          type='button'
        >
          <span className='activity-live-dot' />
          {live ? "live · 1s" : "paused"}
        </button>
        <span>{active} active</span>
        <span>{idleInTxn} idle in txn</span>
        {blocked > 0 && <span className='activity-warn'>{blocked} blocked</span>}
        {longest > 0 && <span className='activity-dim'>longest {formatDuration(longest)}</span>}
      </div>

      <div className='actions activity-toolbar-actions'>
        <div className='activity-segmented'>
          {FILTERS.map(option => (
            <button
              key={option.value}
              className={filter === option.value ? "is-active" : ""}
              onClick={() => onFilterChange(option.value)}
              type='button'
            >
              {option.label}
            </button>
          ))}
        </div>
        <Tooltip label='Refresh'>
          <button className='icon-btn' onClick={onRefresh} type='button'>
            <IconRefresh size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
