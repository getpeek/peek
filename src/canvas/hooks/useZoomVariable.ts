import { useStoreApi } from "@xyflow/react";
import { useEffect } from "react";

// Mirror the live zoom level onto a `--pk-zoom` CSS variable on the ReactFlow
// root. Selection styling divides by it (`calc(2.5px / var(--pk-zoom))`) so the
// ring stays a constant on-screen size instead of scaling with the viewport.
// Written straight to the DOM rather than React state — re-rendering the canvas
// on every zoom frame would defeat the purpose. Same rationale as
// `useInteractionState`'s `data-interacting` toggle.
export function useZoomVariable() {
  const store = useStoreApi();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".react-flow");
    if (!root) {
      return;
    }

    let last = NaN;
    const apply = () => {
      const zoom = store.getState().transform[2];
      if (zoom === last) {
        return;
      }
      last = zoom;
      root.style.setProperty("--pk-zoom", String(zoom));
    };

    apply();
    return store.subscribe(apply);
  }, [store]);
}
