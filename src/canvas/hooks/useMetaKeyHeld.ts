import { useEffect, useState } from "react";

// True while Cmd (Meta) is held. The canvas uses this to swap React Flow's
// `noDragClassName` so the whole node body becomes a drag surface, not just the
// header. Tracked as state (not a DOM flag) because the prop change has to
// trigger a re-render to reach React Flow. `blur` resets it — a missed keyup
// (e.g. after Cmd+Tab steals focus) would otherwise leave the canvas stuck in
// drag-anywhere mode.
export function useMetaKeyHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Meta") {
        setHeld(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Meta") {
        setHeld(false);
      }
    };
    const reset = () => setHeld(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return held;
}
