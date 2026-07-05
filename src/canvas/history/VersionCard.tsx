import { IconChevronLeft, IconChevronRight, IconRestore, IconX } from "@tabler/icons-react";
import { changeCount, describeSummary, formatStamp } from "./format";
import type { HistoryEntry } from "./types";

type VersionCardProps = {
  entry: HistoryEntry;
  index: number;
  count: number;
  left: number;
  // Px from the card's center to the selected dot — non-zero when the card is
  // clamped at a panel edge and the arrow still needs to point at the dot.
  arrowOffset: number;
  onClose: () => void;
  onStep: (delta: number) => void;
  onRestore: () => void;
};

export const VersionCard = ({
  entry,
  index,
  count,
  left,
  arrowOffset,
  onClose,
  onStep,
  onRestore,
}: VersionCardProps) => {
  const isPresent = index === count - 1;
  return (
    <div className='history-card' style={{ left }}>
      <button className='history-card-close' onClick={onClose} title='Close'>
        <IconX size={13} />
      </button>
      <div className='history-card-body'>
        <div className='history-card-title'>
          <span className='version'>Version {entry.seq}</span>
          <span className='stamp'>{formatStamp(entry.takenAt)}</span>
        </div>
        <div className='history-card-desc'>{entry.label ?? describeSummary(entry.summary)}</div>
        <div className='history-card-meta'>
          {isPresent ? (
            <span className='current'>Current version</span>
          ) : (
            <span className='changes'>{changeCount(entry.summary)} changes</span>
          )}
        </div>
      </div>
      <div className='history-card-actions'>
        <button className='primary' onClick={onRestore} disabled={isPresent}>
          <IconRestore size={13} /> {isPresent ? "You are here" : "Restore"}
        </button>
      </div>
      <div className='history-card-pager'>
        <button onClick={() => onStep(-1)} disabled={index === 0}>
          <IconChevronLeft size={13} /> Back
        </button>
        <span className='count'>
          {index + 1} / {count}
        </span>
        <button onClick={() => onStep(1)} disabled={isPresent}>
          Next <IconChevronRight size={13} />
        </button>
      </div>
      <div className='history-card-arrow' style={{ left: `calc(50% + ${arrowOffset}px)` }} />
    </div>
  );
};
