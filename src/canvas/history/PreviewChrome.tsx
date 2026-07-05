import { IconHistory } from "@tabler/icons-react";
import { formatStamp } from "./format";
import type { HistoryPreview } from "./state";

// Everything here is pointer-transparent set dressing: a bottom scrim so the
// glass panel reads against the board, and — while a past version is on
// screen — an inset accent ring + chip so "this is not the present" is
// unmissable.
export const PreviewChrome = ({ preview }: { preview: HistoryPreview | null }) => (
  <>
    <div className='history-scrim' />
    {preview && (
      <div className='history-ring'>
        <span className='history-ring-chip'>
          <IconHistory size={11} />
          Previewing · Version {preview.seq} · {formatStamp(preview.takenAt)}
        </span>
      </div>
    )}
  </>
);
