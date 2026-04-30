import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import type { DatabaseResult } from "../../../state";
import type { ResultData } from "../../types";
import { useCanvas } from "../../hooks/useCanvas";
import { stringifyValue } from "./stringify";

const MONO_CHAR_PX = 7.2;
const CELL_PADDING_PX = 28;
const MIN_COL_W = 80;
const MAX_DEFAULT_COL_W = 360;
const MIN_DRAG_W = 40;
const SAMPLE_ROWS = 30;

export function useColumnWidths({
  data,
  headers,
  columnWidths,
  nodeId,
  scrollContainerRef,
}: {
  data: DatabaseResult;
  headers: string[];
  columnWidths?: Record<string, number>;
  nodeId: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvas = useCanvas();
  const [containerWidth, setContainerWidth] = useState(0);
  const [draftWidth, setDraftWidth] = useState<{
    column: string;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const update = () => setContainerWidth(container.clientWidth);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [scrollContainerRef]);

  const defaultWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    const sampleEnd = Math.min(SAMPLE_ROWS, data.length);
    headers.forEach((header, columnIdx) => {
      let maxLength = header.length;
      for (let rowIdx = 0; rowIdx < sampleEnd; rowIdx++) {
        const cell = data[rowIdx]?.[columnIdx];
        if (!cell) {
          continue;
        }
        const length = stringifyValue(cell[1]).length;
        if (length > maxLength) {
          maxLength = length;
        }
      }
      const naturalPx = Math.round(maxLength * MONO_CHAR_PX + CELL_PADDING_PX);
      widths[header] = Math.max(MIN_COL_W, Math.min(MAX_DEFAULT_COL_W, naturalPx));
    });
    return widths;
  }, [data, headers]);

  const naturalWidthFor = (column: string): number => {
    if (draftWidth?.column === column) {
      return draftWidth.width;
    }
    return columnWidths?.[column] ?? defaultWidths[column] ?? MIN_COL_W;
  };

  const naturalTotalWidth = headers.reduce((sum, header) => sum + naturalWidthFor(header), 0);
  const shouldExpand = containerWidth > 0 && naturalTotalWidth < containerWidth;
  const scale = shouldExpand ? containerWidth / naturalTotalWidth : 1;
  const widthFor = (column: string): number => naturalWidthFor(column) * scale;
  const totalWidth = shouldExpand ? containerWidth : naturalTotalWidth;

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, column: string) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths?.[column] ?? defaultWidths[column] ?? MIN_COL_W;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const computeWidth = (clientX: number) =>
        Math.max(MIN_DRAG_W, startWidth + (clientX - startX));

      const onMove = (ev: PointerEvent) => {
        setDraftWidth({ column, width: computeWidth(ev.clientX) });
      };
      const onUp = (ev: PointerEvent) => {
        const finalWidth = computeWidth(ev.clientX);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
        setDraftWidth(null);
        canvas.updateNodeData<ResultData>(nodeId, d => ({
          ...d,
          columnWidths: { ...d.columnWidths, [column]: finalWidth },
        }));
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    [canvas, columnWidths, defaultWidths, nodeId],
  );

  return { widthFor, totalWidth, startResize };
}
