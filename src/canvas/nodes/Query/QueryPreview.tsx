const PREVIEW_LINE_COUNT = 8;

interface QueryPreviewProps {
  query: string;
  onActivate: () => void;
}

/**
 * Lightweight stand-in for the Monaco editor shown while a Query node is
 * zoomed out and hasn't been activated. Plain text — no editor DOM — so a
 * board full of queries stays cheap to pan/zoom. Clicking mounts the real
 * editor.
 */
export function QueryPreview({ query, onActivate }: QueryPreviewProps) {
  const lines = query.split("\n").slice(0, PREVIEW_LINE_COUNT).join("\n").trim();

  return (
    <button
      type='button'
      className='query-preview nodrag'
      onClick={onActivate}
      title='Click to edit'
    >
      <span className='query-preview-code'>{lines || "-- empty query"}</span>
    </button>
  );
}
