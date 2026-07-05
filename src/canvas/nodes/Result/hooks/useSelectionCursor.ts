import { useEffect, useState } from "react";

/**
 * Cursor class for the modifier held over the result body — Cmd/Ctrl → move (the
 * node drags instead of selecting), Shift → row selection. Plain hover uses the
 * CSS default (cell) cursor. Modifier state can't be read from CSS alone.
 */
function cursorClassFor(e: KeyboardEvent): string | undefined {
  if (e.metaKey || e.ctrlKey) {
    return "move-cursor";
  }
  if (e.shiftKey) {
    return "row-cursor";
  }
  return undefined;
}

export function useSelectionCursor(): string | undefined {
  const [cursor, setCursor] = useState<string>();

  useEffect(() => {
    const sync = (e: KeyboardEvent) => setCursor(cursorClassFor(e));
    const reset = () => setCursor(undefined);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    // A modifier released outside the window never fires keyup — reset on blur.
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return cursor;
}
