import { useCallback } from "react";

// React attaches `wheel` listeners as passive, so an `onWheel` prop can't
// preventDefault the browser's page-zoom/scroll. A native non-passive listener
// can, which is why this is a callback ref rather than a JSX handler.
function forwardWheel(e: WheelEvent) {
  const renderer = document.querySelector(".react-flow__renderer");
  if (!(renderer instanceof HTMLElement)) {
    return;
  }
  e.preventDefault();
  // Re-dispatch onto the element d3-zoom listens on. The wayfinding overlay is a
  // sibling of the renderer, so wheel events over a label never reach it otherwise.
  // clientX/Y are preserved so zoom stays anchored to the cursor.
  renderer.dispatchEvent(
    new WheelEvent("wheel", {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode: e.deltaMode,
      clientX: e.clientX,
      clientY: e.clientY,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/**
 * Callback ref that forwards wheel events on an interactive wayfinding label to
 * the canvas, so panning and pinch-zoom keep working with the cursor over a
 * region beacon or edge peeker.
 */
export function useCanvasWheelForward() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) {
      return;
    }
    el.addEventListener("wheel", forwardWheel, { passive: false });
    return () => el.removeEventListener("wheel", forwardWheel);
  }, []);
}
