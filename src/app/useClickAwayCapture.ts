import { useEffect, useRef, type RefObject } from "react";

/**
 * Close-on-outside-click that works over the React Flow canvas.
 *
 * The canvas pane (and d3-zoom) call stopPropagation on bubble-phase pointer
 * events, so document-level bubble listeners — including Mantine's built-in
 * closeOnClickOutside and useClickOutside — never see clicks that land on the
 * canvas. Listening in the capture phase catches the pointerdown before the
 * pane swallows it.
 *
 * Pass every element that counts as "inside": for a portaled Mantine dropdown
 * that means the target *and* the dropdown, since the dropdown renders
 * elsewhere in the DOM.
 */
export function useClickAwayCapture(
  active: boolean,
  onClickAway: () => void,
  insideRefs: RefObject<HTMLElement | null>[],
) {
  const latest = useRef({ onClickAway, insideRefs });
  latest.current = { onClickAway, insideRefs };

  useEffect(() => {
    if (!active) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const current = latest.current;
      if (current.insideRefs.some(ref => ref.current?.contains(target))) {
        return;
      }
      current.onClickAway();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [active]);
}
