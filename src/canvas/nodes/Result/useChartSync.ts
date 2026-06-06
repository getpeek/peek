import { useEffect } from "react";
import { buildChartData } from "../../createChart";
import { useCanvas } from "../../hooks/useCanvas";
import type { DatabaseResult } from "../../../state";
import type { BarChartData } from "../../types";

export function useChartSync(opts: { nodeId: string; rows: DatabaseResult }) {
  const { nodeId, rows } = opts;
  const canvas = useCanvas();

  useEffect(() => {
    // resultsAtom isn't persisted; on document load rows is empty until a re-run.
    // Skip so we don't clobber the chart's saved data with an empty set.
    if (rows.length === 0) {
      return;
    }
    const edge = canvas
      .getEdges()
      .find(e => e.source === nodeId && canvas.getNode(e.target)?.type === "barchart");
    if (!edge) {
      return;
    }
    canvas.updateNodeData<BarChartData>(edge.target, { data: buildChartData(rows) });
  }, [canvas, nodeId, rows]);
}
