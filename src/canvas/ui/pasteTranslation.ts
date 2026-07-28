import type { AppNode } from "../types";

const FALLBACK_OFFSET = 20;

/**
 * Offset that lands a pasted clipboard's bounding box in the middle of the
 * visible pane, so a paste always arrives on screen rather than back at the
 * coordinates it was copied from.
 */
export function pasteTranslation(
  nodes: AppNode[],
  screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number },
): { x: number; y: number } {
  const pane = document.querySelector<HTMLElement>(".react-flow__pane");
  if (!pane) {
    return { x: FALLBACK_OFFSET, y: FALLBACK_OFFSET };
  }
  const xs = nodes.map(n => n.position.x);
  const ys = nodes.map(n => n.position.y);
  const rights = nodes.map(n => n.position.x + (n.width ?? n.measured?.width ?? 0));
  const bottoms = nodes.map(n => n.position.y + (n.height ?? n.measured?.height ?? 0));
  const bboxCenter = {
    x: (Math.min(...xs) + Math.max(...rights)) / 2,
    y: (Math.min(...ys) + Math.max(...bottoms)) / 2,
  };
  const rect = pane.getBoundingClientRect();
  const viewportCenter = screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
  return {
    x: viewportCenter.x - bboxCenter.x,
    y: viewportCenter.y - bboxCenter.y,
  };
}
