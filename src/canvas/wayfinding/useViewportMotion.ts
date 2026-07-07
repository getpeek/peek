import { useEffect, useRef, useState } from "react";

const IDLE_MS = 900;

/**
 * True while the viewport is moving (any pan/zoom change), lingering for a
 * moment after it settles. The very first transform is ignored so nothing
 * flashes on mount. Peekers use this as their "transient compass" signal.
 */
export function useViewportMotion(tx: number, ty: number, tz: number): boolean {
  const [moving, setMoving] = useState(false);
  // 0 is never a real timer id, so clearing it on first run is a no-op.
  const timerRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setMoving(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMoving(false), IDLE_MS);
  }, [tx, ty, tz]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return moving;
}
