import type { CanvasApi } from "../../state";
import type { ResultData } from "../../types";

// Pivot is a narrow two-column layout, so it wants a slimmer, taller node than
// the wide table. Height grows with the column count (one field per row).
const PIVOT_WIDTH = 460;
const PIVOT_CHROME_HEIGHT = 130;
const PIVOT_ROW_HEIGHT = 34;
const PIVOT_MIN_HEIGHT = 260;
const PIVOT_MAX_HEIGHT = 900;
const DEFAULT_WIDTH = 620;
const DEFAULT_HEIGHT = 640;

function pivotHeight(columnCount: number): number {
  const fit = PIVOT_CHROME_HEIGHT + columnCount * PIVOT_ROW_HEIGHT;
  return Math.min(Math.max(fit, PIVOT_MIN_HEIGHT), PIVOT_MAX_HEIGHT);
}

/**
 * Toggles a result node between the table and pivot (record) views, reshaping it
 * to suit: pivoting shrinks the width and grows the height with the column count,
 * and toggling back restores the size the node had before it was pivoted.
 */
export function togglePivot(canvas: CanvasApi, nodeId: string, columnCount: number): void {
  const node = canvas.getNode(nodeId);
  if (!node || node.type !== "result") {
    return;
  }

  if (node.data.pivoted) {
    const restore = node.data.prePivotSize;
    canvas.updateNodeData<ResultData>(nodeId, d => ({
      ...d,
      pivoted: false,
      prePivotSize: undefined,
    }));
    canvas.updateNode(nodeId, n => ({
      ...n,
      width: restore?.width ?? DEFAULT_WIDTH,
      height: restore?.height ?? DEFAULT_HEIGHT,
    }));
    return;
  }

  canvas.updateNodeData<ResultData>(nodeId, d => ({
    ...d,
    pivoted: true,
    prePivotSize: { width: node.width ?? DEFAULT_WIDTH, height: node.height ?? DEFAULT_HEIGHT },
  }));
  canvas.updateNode(nodeId, n => ({
    ...n,
    width: Math.min(node.width ?? DEFAULT_WIDTH, PIVOT_WIDTH),
    height: pivotHeight(columnCount),
  }));
}
