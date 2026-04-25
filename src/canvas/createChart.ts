import { ids } from "./ids";
import type { CanvasApi } from "./state";
import type { BarChartNode, ResultNode } from "./types";

export function createChart(canvas: CanvasApi, resultNode: ResultNode) {
  if (resultNode.data.data.length === 0) {
    return;
  }

  const fields: Record<string, string | number>[] = [];

  for (const row of resultNode.data.data) {
    const chartRow: Record<string, string | number> = {};
    for (const [key, value] of row) {
      if (typeof value === "number" || typeof value === "string") {
        chartRow[key] = value;
      }
    }
    fields.push(chartRow);
  }

  const chartNodeId = ids.chart(resultNode.id);
  const existing = canvas.getNode(chartNodeId);

  if (existing) {
    canvas.updateNodeData(chartNodeId, { data: fields });
  } else {
    const w = Math.max(resultNode.width ?? 500, 500);
    const h = 500;
    const chartNode: BarChartNode = {
      id: chartNodeId,
      type: "barchart",
      position: {
        x: resultNode.position.x,
        y: resultNode.position.y - h - 40,
      },
      width: w,
      height: h,
      data: { data: fields },
    };
    canvas.addNode(chartNode);
    canvas.connect(resultNode.id, chartNodeId);
  }

  canvas.selectOnly(chartNodeId);
  canvas.zoomToNode(chartNodeId, { duration: 300 });
}
