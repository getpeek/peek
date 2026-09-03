import { useState } from "react";

interface ActivityFooterProps {
  /** Where the rows come from: "pg_stat_activity" | "processlist". */
  sourceName: string;
  database: string;
  refreshedAgoSecs: number;
  selectedCount: number;
  onShowSourceQuery: () => void;
  onKillSelected: () => void;
  onClearSelection: () => void;
}

export function ActivityFooter({
  sourceName,
  database,
  refreshedAgoSecs,
  selectedCount,
  onShowSourceQuery,
  onKillSelected,
  onClearSelection,
}: ActivityFooterProps) {
  const [confirming, setConfirming] = useState(false);

  if (selectedCount > 0) {
    return (
      <div className='app-node-footer nodrag activity-footer'>
        {confirming ? (
          <>
            <span className='meta'>Kill {selectedCount} queries?</span>
            <div className='activity-footer-actions'>
              <button
                className='btn btn-danger'
                onClick={() => {
                  onKillSelected();
                  setConfirming(false);
                }}
                type='button'
              >
                Yes
              </button>
              <button className='btn btn-ghost' onClick={() => setConfirming(false)} type='button'>
                No
              </button>
            </div>
          </>
        ) : (
          <>
            <span className='meta'>{selectedCount} selected</span>
            <div className='activity-footer-actions'>
              <button className='btn btn-danger' onClick={() => setConfirming(true)} type='button'>
                Kill {selectedCount}
              </button>
              <button className='btn btn-ghost' onClick={onClearSelection} type='button'>
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className='app-node-footer nodrag activity-footer'>
      <span className='meta'>
        {sourceName} · {database} · refreshed {refreshedAgoSecs}s ago
      </span>
      <button className='activity-source-link' onClick={onShowSourceQuery} type='button'>
        Show source query
      </button>
    </div>
  );
}
