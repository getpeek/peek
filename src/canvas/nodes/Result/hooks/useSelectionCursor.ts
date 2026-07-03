import { useEffect, useState } from "react";

/**
 * Cells select on plain drag, so the grid-selection cursor is the CSS default.
 * While Shift is held the gesture switches to row selection — this returns the
 * class that repaints the cursor to match. A modifier can't be read from CSS.
 */
export function useSelectionCursor(): string | undefined {
  const [cursor, setCursor] = useState<string>();

  useEffect(() => {
    const sync = (e: KeyboardEvent) => setCursor(e.shiftKey ? "row-cursor" : undefined);
    const reset = () => setCursor(undefined);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    // Shift released outside the window never fires keyup — reset on blur.
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return cursor;
}
