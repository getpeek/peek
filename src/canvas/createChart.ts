import { ids } from "./ids";
import { isNumericType } from "./nodes/Result/inlineEdit";
import type { CanvasApi } from "./state";
import type { DatabaseResult } from "../state";
import type { BarChartNode, ResultNode } from "./types";

export function buildChartData(rows: DatabaseResult): Record<string, string | number>[] {
  const fields: Record<string, string | number>[] = [];

  for (const row of rows) {
    const chartRow: Record<string, string | number> = {};
    for (const [key, value, type] of row) {
      if (value === null || value === undefined) {
        continue;
      }
      // NUMERIC/DECIMAL/BIGINT often arrive as strings to preserve precision;
      // coerce them so the chart treats them as plottable series, not labels.
      if (isNumericType(type)) {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          chartRow[key] = numeric;
        }
        continue;
      }
      if (typeof value === "number" || typeof value === "string") {
        chartRow[key] = value;
      }
    }
    fields.push(chartRow);
  }

  return fields;
}

export function createChart(canvas: CanvasApi, resultNode: ResultNode, rows: DatabaseResult) {
  if (rows.length === 0) {
    return;
  }

  const fields = buildChartData(rows);

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
      data: { data: fields, chartType: "bar" },
    };
    canvas.addNode(chartNode);
    canvas.connect(resultNode.id, chartNodeId);
  }

  canvas.selectOnly(chartNodeId);
  canvas.zoomToNode(chartNodeId, { duration: 300 });
}
