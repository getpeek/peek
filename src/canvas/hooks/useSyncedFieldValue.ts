import { useEffect, useState } from "react";

// Mirrors an external value in local state so a controlled field's caret
// survives a keystroke. Binding `value` straight to node data sends each edit
// on a round trip through jotai and React Flow's internal store, which lands a
// frame late — long enough for the controlled field to render stale and the
// browser to jump the caret to the end. Rendering from local state keeps it
// synchronous; we only adopt the source again when it changes from the outside
// (remote edit, undo, array toggle).
export function useSyncedFieldValue(source: string): [string, (next: string) => void] {
  const [local, setLocal] = useState(source);

  useEffect(() => {
    setLocal(source);
  }, [source]);

  return [local, setLocal];
}
