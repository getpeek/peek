import { makeNode } from "../../defaults";
import { nodeHeight, nodeWidth } from "../../nodeGeometry";
import type { CanvasApi } from "../../state";
import type { AppNode } from "../../types";

/** Gap between the existing nodes' bounding box and the activity node below it. */
const SPAWN_GAP = 80;
const ZOOM_DURATION_MS = 300;

function positionBelowAll(canvas: CanvasApi, nodes: AppNode[], width: number) {
  if (nodes.length === 0) {
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) {
      return { x: 0, y: 0 };
    }
    const rect = pane.getBoundingClientRect();
    const center = canvas.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    return { x: center.x - width / 2, y: center.y };
  }

  const lefts = nodes.map(n => n.position.x);
  const rights = nodes.map(n => n.position.x + nodeWidth(n));
  const bottoms = nodes.map(n => n.position.y + nodeHeight(n));
  const bboxCenterX = (Math.min(...lefts) + Math.max(...rights)) / 2;

  return { x: bboxCenterX - width / 2, y: Math.max(...bottoms) + SPAWN_GAP };
}

/**
 * Reveals the page's activity node, creating it below everything else if there
 * isn't one. Shared by the palette command, the toolbar button and the hotkey so
 * all three behave identically — one node per page, never a second.
 */
export function showRunningQueries(canvas: CanvasApi) {
  const nodes = canvas.getNodes();
  const existing = nodes.find(node => node.type === "activity");
  if (existing) {
    canvas.selectOnly(existing.id);
    canvas.zoomToNode(existing.id, { duration: ZOOM_DURATION_MS });
    return;
  }

  const node = makeNode("activity", { x: 0, y: 0 });
  node.position = positionBelowAll(canvas, nodes, nodeWidth(node));
  canvas.addNode(node);
  canvas.selectOnly(node.id);
  canvas.zoomToNode(node.id, { duration: ZOOM_DURATION_MS });
}
