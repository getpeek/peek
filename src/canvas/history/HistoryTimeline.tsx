import "./History.css";
import { IconHandMove, IconX } from "@tabler/icons-react";
import { Fragment, useEffect } from "react";
import { changeCount, formatDay } from "./format";
import { PreviewChrome } from "./PreviewChrome";
import { useHistoryPanel } from "./useHistoryPanel";
import { TRACK_PITCH, useTimelineTrack } from "./useTimelineTrack";
import { VersionCard } from "./VersionCard";
import type { HistoryEntry } from "./types";

const dotSize = (entry: HistoryEntry) => 8 + Math.min(changeCount(entry.summary), 12) * 0.8;

// Gridline + label wherever the calendar day changes between checkpoints.
function dayMarks(entries: HistoryEntry[]): { index: number; label: string }[] {
  const marks: { index: number; label: string }[] = [];
  entries.forEach((entry, index) => {
    const day = new Date(entry.takenAt).toDateString();
    const previousDay = index > 0 ? new Date(entries[index - 1].takenAt).toDateString() : null;
    if (day !== previousDay) {
      marks.push({ index, label: formatDay(entry.takenAt) });
    }
  });
  return marks;
}

export const HistoryTimeline = () => {
  const panel = useHistoryPanel();
  const track = useTimelineTrack(panel.entries.length, panel.open);

  const selectedIndex = panel.entries.findIndex(e => e.id === panel.selectedId);

  useEffect(() => {
    if (selectedIndex >= 0) {
      track.ensureVisible(selectedIndex);
    }
  }, [selectedIndex]);

  if (!panel.open) {
    return null;
  }

  const count = panel.entries.length;
  const fillIndex = selectedIndex >= 0 ? selectedIndex : count - 1;
  // Clamp the card's center so the full card stays inside the panel; the
  // arrow keeps tracking the actual dot when the card can't.
  const cardHalf = 158;
  const dotScreenX = track.dotX(selectedIndex) - track.offset;
  const cardLeft = Math.min(track.viewportWidth - cardHalf, Math.max(cardHalf, dotScreenX));
  const arrowOffset = Math.max(-130, Math.min(130, dotScreenX - cardLeft));

  return (
    <>
      <PreviewChrome preview={panel.preview} />
      <div className='history-panel'>
        <div className='history-head'>
          <span className='title'>Version History</span>
          <span className='spacer' />
          <span className='hint'>
            <IconHandMove size={13} /> Drag to scroll · click a checkpoint
          </span>
          <button className='history-close' onClick={panel.closePanel} title='Exit history (Esc)'>
            <IconX size={15} />
          </button>
        </div>

        <div
          className='history-viewport'
          ref={track.viewportRef}
          onPointerDown={track.onPointerDown}
          onPointerMove={track.onPointerMove}
          onPointerUp={track.onPointerUp}
          onWheel={track.onWheel}
        >
          <div
            className='history-track'
            style={{ width: track.trackWidth, transform: `translateX(${-track.offset}px)` }}
          >
            {dayMarks(panel.entries).map(mark => (
              <Fragment key={mark.index}>
                {mark.index > 0 && (
                  <div
                    className='history-gridline'
                    style={{ left: track.dotX(mark.index) - TRACK_PITCH / 2 }}
                  />
                )}
                <span className='history-day' style={{ left: track.dotX(mark.index) }}>
                  {mark.label}
                </span>
              </Fragment>
            ))}
            <div className='history-rail' />
            {count > 0 && (
              <div className='history-rail-fill' style={{ width: track.dotX(fillIndex) }} />
            )}
            {panel.entries.map((entry, index) => {
              const size = dotSize(entry);
              const isSelected = entry.id === panel.selectedId;
              return (
                <Fragment key={entry.id}>
                  {entry.label && (
                    <button
                      className={`history-tag ${isSelected ? "active" : ""}`}
                      style={{ left: track.dotX(index) }}
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => panel.select(entry.id)}
                    >
                      {entry.label}
                    </button>
                  )}
                  <button
                    className={[
                      "history-dot",
                      entry.label ? "milestone" : "",
                      entry.id === panel.presentId ? "present" : "",
                      isSelected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ left: track.dotX(index), width: size, height: size }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => panel.select(entry.id)}
                    title={`Version ${entry.seq}`}
                  />
                </Fragment>
              );
            })}
          </div>
        </div>

        {selectedIndex >= 0 && (
          <div className='history-card-layer'>
            <VersionCard
              entry={panel.entries[selectedIndex]}
              index={selectedIndex}
              count={count}
              left={cardLeft}
              arrowOffset={arrowOffset}
              onClose={panel.closeCard}
              onStep={panel.selectByOffset}
              onRestore={() => void panel.restore()}
            />
          </div>
        )}
      </div>

      {panel.toast && (
        <div className='history-toast'>
          <span className='dot' />
          {panel.toast}
        </div>
      )}
    </>
  );
};
