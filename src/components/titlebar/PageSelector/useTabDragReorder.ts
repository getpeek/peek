import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const DRAG_THRESHOLD = 4;

export type TabDragState = {
  draggingId: string;
  originalIndex: number;
  previewIndex: number;
  pointerDx: number;
  draggedWidth: number;
  gap: number;
};

type DragRefState = {
  draggingId: string;
  originalIndex: number;
  pointerStartClientX: number;
  pointerId: number;
  centers: number[];
  widths: number[];
  draggedWidth: number;
  gap: number;
};

export type TabHandlers = {
  ref: (el: HTMLButtonElement | null) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
};

export type TabDragReorder = {
  dragState: TabDragState | null;
  getTabHandlers: (pageId: string, index: number) => TabHandlers;
  wasDragging: () => boolean;
};

function computePreview(originalIndex: number, dragCenter: number, centers: number[]): number {
  const filtered = centers.filter((_, i) => i !== originalIndex);
  for (let k = 0; k < filtered.length; k++) {
    if (dragCenter <= filtered[k]) {
      return k;
    }
  }
  return filtered.length;
}

export function useTabDragReorder(
  pageIds: string[],
  commit: (pageId: string, toIndex: number) => void,
): TabDragReorder {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragRef = useRef<DragRefState | null>(null);
  const didDragRef = useRef(false);
  const [dragState, setDragState] = useState<TabDragState | null>(null);

  const handleMove = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) {
      return;
    }
    const dx = e.clientX - drag.pointerStartClientX;
    if (!didDragRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) {
        return;
      }
      didDragRef.current = true;
    }
    const dragCenter = drag.centers[drag.originalIndex] + dx;
    const previewIndex = computePreview(drag.originalIndex, dragCenter, drag.centers);
    setDragState({
      draggingId: drag.draggingId,
      originalIndex: drag.originalIndex,
      previewIndex,
      pointerDx: dx,
      draggedWidth: drag.draggedWidth,
      gap: drag.gap,
    });
  };

  const handleUp = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) {
      return;
    }
    if (didDragRef.current) {
      const dx = e.clientX - drag.pointerStartClientX;
      const dragCenter = drag.centers[drag.originalIndex] + dx;
      const previewIndex = computePreview(drag.originalIndex, dragCenter, drag.centers);
      if (previewIndex !== drag.originalIndex) {
        commit(drag.draggingId, previewIndex);
      }
    }
    cleanup();
  };

  const handleCancel = () => cleanup();

  const cleanup = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleCancel);
    dragRef.current = null;
    setDragState(null);
  };

  const onPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    pageId: string,
    index: number,
  ) => {
    if (e.button !== 0 || pageIds.length <= 1) {
      return;
    }
    didDragRef.current = false;
    const els: HTMLButtonElement[] = [];
    for (const id of pageIds) {
      const el = tabRefs.current.get(id);
      if (!el) {
        return;
      }
      els.push(el);
    }
    const rects = els.map(el => el.getBoundingClientRect());
    const widths = rects.map(r => r.width);
    const centers = rects.map(r => r.left + r.width / 2);
    const gap = rects.length > 1 ? rects[1].left - (rects[0].left + rects[0].width) : 4;
    dragRef.current = {
      draggingId: pageId,
      originalIndex: index,
      pointerStartClientX: e.clientX,
      pointerId: e.pointerId,
      centers,
      widths,
      draggedWidth: widths[index],
      gap,
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  };

  return {
    dragState,
    getTabHandlers: (pageId, index) => ({
      ref: el => {
        if (el) {
          tabRefs.current.set(pageId, el);
        } else {
          tabRefs.current.delete(pageId);
        }
      },
      onPointerDown: e => onPointerDown(e, pageId, index),
    }),
    wasDragging: () => didDragRef.current,
  };
}

export function siblingSlideX(oldIdx: number, drag: TabDragState | null): number {
  if (!drag || oldIdx === drag.originalIndex) {
    return 0;
  }
  const shift = drag.draggedWidth + drag.gap;
  if (oldIdx < drag.originalIndex && oldIdx >= drag.previewIndex) {
    return shift;
  }
  if (oldIdx > drag.originalIndex && oldIdx <= drag.previewIndex) {
    return -shift;
  }
  return 0;
}
