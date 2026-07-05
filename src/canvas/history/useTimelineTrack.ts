import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

export const TRACK_PITCH = 76;
export const TRACK_PAD = 48;
// Keep the selected dot comfortably inside the masked edges when paging.
const VISIBLE_PAD = 130;

// The track is wider than the panel; pan it like the canvas — drag or wheel.
export function useTimelineTrack(count: number, active: boolean) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const panRef = useRef({ pointerId: -1, startX: 0, startOffset: 0 });

  const trackWidth = TRACK_PAD * 2 + Math.max(0, count - 1) * TRACK_PITCH;
  const maxOffset = Math.max(0, trackWidth - viewportWidth);
  const clampOffset = (value: number) => Math.min(maxOffset, Math.max(0, value));
  const dotX = (index: number) => TRACK_PAD + index * TRACK_PITCH;

  // The viewport element only exists while the panel is open (the timeline
  // renders null when closed), so measurement must re-attach on every open —
  // a mount-only effect would leave viewportWidth at 0 and push the whole
  // track off screen.
  useEffect(() => {
    if (!active) {
      return;
    }
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    observer.observe(el);
    setViewportWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [active]);

  // Open on the present (rightmost) checkpoint and follow new appends; a
  // track shorter than the viewport clamps to 0 and stays fully visible.
  useEffect(() => {
    if (active) {
      setOffset(Math.max(0, trackWidth - viewportWidth));
    }
  }, [active, count, trackWidth, viewportWidth]);

  const ensureVisible = (index: number) => {
    setOffset(current => {
      const x = dotX(index);
      if (x < current + VISIBLE_PAD) {
        return clampOffset(x - VISIBLE_PAD);
      }
      if (x > current + viewportWidth - VISIBLE_PAD) {
        return clampOffset(x - viewportWidth + VISIBLE_PAD);
      }
      return current;
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    viewportRef.current?.setPointerCapture(e.pointerId);
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startOffset: offset };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current.pointerId !== e.pointerId) {
      return;
    }
    setOffset(clampOffset(panRef.current.startOffset - (e.clientX - panRef.current.startX)));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current.pointerId === e.pointerId) {
      panRef.current.pointerId = -1;
    }
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta) {
      setOffset(current => clampOffset(current + delta));
    }
  };

  return {
    viewportRef,
    viewportWidth,
    trackWidth,
    offset,
    dotX,
    ensureVisible,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  };
}
