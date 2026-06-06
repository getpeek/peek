import { useEffect, useRef } from "react";

// How long after the last pan/zoom/drag event before we consider the gesture
// finished. Long enough that momentum scrolling and rapid wheel ticks don't
// flip the attribute off→on repeatedly (each flip re-rasterizes the nodes).
const INTERACTION_END_DELAY_MS = 140;

interface InteractionController {
  begin: () => void;
  endDebounced: () => void;
  dispose: () => void;
}

// Toggles `data-interacting` on the ReactFlow root via the DOM, not React
// state: a re-render here would churn the whole canvas subtree at the exact
// moment we're trying to free the main thread for paint. CSS keys off the
// attribute to drop transitions, flatten shadows, and pause animations while
// the user is moving the canvas.
function createInteractionController(): InteractionController {
  let root: HTMLElement | null = null;
  let timer: number | null = null;
  let active = false;

  const resolveRoot = (): HTMLElement | null => {
    if (root === null) {
      root = document.querySelector<HTMLElement>(".react-flow");
    }
    return root;
  };

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  return {
    begin() {
      clearTimer();
      if (active) {
        return;
      }
      active = true;
      const el = resolveRoot();
      if (el) {
        el.dataset.interacting = "";
      }
    },
    endDebounced() {
      clearTimer();
      timer = window.setTimeout(() => {
        timer = null;
        active = false;
        if (root) {
          delete root.dataset.interacting;
        }
      }, INTERACTION_END_DELAY_MS);
    },
    dispose() {
      clearTimer();
      if (root) {
        delete root.dataset.interacting;
      }
    },
  };
}

export function useInteractionState(): InteractionController {
  const ref = useRef<InteractionController | null>(null);
  if (ref.current === null) {
    ref.current = createInteractionController();
  }
  const controller = ref.current;
  useEffect(() => () => controller.dispose(), [controller]);
  return controller;
}
