import { useEffect, type RefObject } from "react";

export function useScrollFallthrough(
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const handler = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      let el: Element | null = e.target as Element | null;
      while (el) {
        if (canAbsorb(el, e)) {
          e.stopPropagation();
          return;
        }
        if (el === root) break;
        el = el.parentElement;
      }
    };

    root.addEventListener("wheel", handler);
    return () => root.removeEventListener("wheel", handler);
  }, [ref]);
}

function canAbsorb(el: Element, e: WheelEvent): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const style = getComputedStyle(el);

  if (e.deltaY !== 0) {
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return true;
    }
  }

  if (e.deltaX !== 0) {
    const ox = style.overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth) {
      const atLeft = el.scrollLeft <= 0;
      const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((e.deltaX < 0 && !atLeft) || (e.deltaX > 0 && !atRight)) return true;
    }
  }

  return false;
}
