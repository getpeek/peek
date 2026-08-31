import { useEffect, useRef, useState } from "react";
import { BAR_FULL_MS } from "./activitySql";
import { formatDuration, severityFor, type ActivityRow as Row } from "./activityRow";
import { ActivityRowMenu } from "./ActivityRowMenu";
import { formatActivityQuery } from "./formatQuery";
import { useHighlightedSql } from "./highlightSql";
import type { KillState } from "./useKillBackends";

/** How long the "query copied" / "pid copied" confirmation stays on the meta line. */
const COPIED_MS = 1300;

interface ActivityRowProps {
  row: Row;
  /**
   * Server-reported age plus the time elapsed since that poll, so it ticks smoothly.
   * Null when the engine reported no query_start.
   */
  displayedMs: number | null;
  selected: boolean;
  killState: KillState | undefined;
  onToggleSelect: () => void;
  onKill: () => void;
}

function stateLabel(state: string): string {
  return state.startsWith("idle in transaction") ? "idle in txn" : state;
}

function stateClass(state: string): string {
  if (state === "active") {
    return "is-active";
  }
  return state.startsWith("idle in transaction") ? "is-idle-txn" : "is-other";
}

export function ActivityRowView({
  row,
  displayedMs,
  selected,
  killState,
  onToggleSelect,
  onKill,
}: ActivityRowProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryText = formatActivityQuery(row.query);
  const highlighted = useHighlightedSql(queryText);
  const severity = severityFor(displayedMs);
  const terminating = killState?.phase === "terminating";
  const terminated = killState?.phase === "terminated";

  useEffect(() => () => window.clearTimeout(copiedTimer.current ?? undefined), []);

  const flash = (message: string) => {
    setCopied(message);
    window.clearTimeout(copiedTimer.current ?? undefined);
    copiedTimer.current = window.setTimeout(() => setCopied(null), COPIED_MS);
  };

  const copyQuery = () => {
    void navigator.clipboard.writeText(queryText);
    flash("query copied");
  };

  const copyPid = () => {
    void navigator.clipboard.writeText(String(row.pid));
    flash("pid copied");
  };

  const classes = [
    "activity-row",
    `sev-${severity}`,
    selected ? "is-selected" : null,
    menuOpen ? "menu-open" : null,
    terminating ? "is-terminating" : null,
    terminated ? "is-terminated" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className='activity-cell-check'>
        {!killState && (
          <input
            type='checkbox'
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select pid ${row.pid}`}
          />
        )}
      </div>

      <div className='activity-cell-duration'>
        {displayedMs === null ? (
          <span className='activity-duration is-unknown' title='No query_start reported'>
            —
          </span>
        ) : (
          <>
            <span className='activity-duration'>{formatDuration(displayedMs)}</span>
            <span className='activity-bar'>
              <span
                className='activity-bar-fill'
                style={{ width: `${Math.min(100, (displayedMs / BAR_FULL_MS) * 100)}%` }}
              />
            </span>
          </>
        )}
      </div>

      <div className='activity-cell-main'>
        <div className='activity-meta'>
          <span className='activity-pid'>{row.pid}</span>
          <span className={`activity-state ${stateClass(row.state)}`}>{stateLabel(row.state)}</span>
          <span className='activity-dim'>
            {row.user}@{row.database}
          </span>
          {row.application && <span className='activity-dim'>{row.application}</span>}
          {row.backendType && row.backendType !== "client backend" && (
            <span className='activity-system'>{row.backendType}</span>
          )}
          {row.waitingOn && <span className='activity-dim'>{row.waitingOn}</span>}
          {row.blockedBy !== null && (
            <span className='activity-blocked'>blocked by {row.blockedBy}</span>
          )}
          {killState?.phase === "failed" && (
            <span className='activity-blocked'>{killState.message}</span>
          )}
          {killState?.phase === "skipped" && (
            <span className='activity-dim'>{killState.message}</span>
          )}
          {copied && <span className='activity-copied'>{copied}</span>}
        </div>

        {highlighted === null ? (
          <pre className='activity-query'>{queryText}</pre>
        ) : (
          // `colorize` escapes its input, so DB-sourced query text is safe here.
          <pre className='activity-query' dangerouslySetInnerHTML={{ __html: highlighted }} />
        )}
      </div>

      <div className='activity-cell-actions'>
        {terminating && <span className='activity-kill-status'>terminating…</span>}
        {terminated && <span className='activity-kill-status'>terminated</span>}
        {!terminating && !terminated && (
          <ActivityRowMenu
            pid={row.pid}
            onCopyQuery={copyQuery}
            onCopyPid={copyPid}
            onKill={onKill}
            onOpenChange={setMenuOpen}
          />
        )}
      </div>
    </div>
  );
}
