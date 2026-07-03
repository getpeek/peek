import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { aggregateSelection } from "../aggregate";
import { cellSelectionSummaryAtom } from "../../../state";
import type { CellRect } from "./useCellSelection";
import type { DatabaseResult } from "../../../../state";

/**
 * Publishes aggregates for this node's cell selection to the canvas-level
 * summary bar. Owned by nodeId so one node's clear (or unmount) never wipes
 * another node's active summary.
 */
export function useSelectionSummary({
  nodeId,
  data,
  visibleIndices,
  rect,
}: {
  nodeId: string;
  data: DatabaseResult;
  visibleIndices: number[];
  rect: CellRect | null;
}) {
  const setSummary = useSetAtom(cellSelectionSummaryAtom);

  useEffect(() => {
    const aggregates = rect ? aggregateSelection(data, rect, visibleIndices) : null;
    setSummary(prev => {
      if (aggregates) {
        return { nodeId, ...aggregates };
      }
      return prev?.nodeId === nodeId ? null : prev;
    });
  }, [nodeId, data, visibleIndices, rect, setSummary]);

  useEffect(() => {
    return () => setSummary(prev => (prev?.nodeId === nodeId ? null : prev));
  }, [nodeId, setSummary]);
}
