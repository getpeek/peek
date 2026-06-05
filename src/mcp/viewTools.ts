import { getDefaultStore } from "jotai";
import { canvasApiAtom, documentAtom } from "../canvas/state";
import { pageContainingNode } from "./createNodes";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

export function cameraPanTo(params: Record<string, unknown>): unknown {
  const canvas = getDefaultStore().get(canvasApiAtom);
  if (!canvas) {
    return { error: "canvas not available" };
  }
  const [x, y] = params.position as [number, number];
  // Pass the current zoom so panning never changes it.
  canvas.panToPoint(x, y, { zoom: canvas.getZoom() });
  return { ok: true };
}

export function cameraSetZoom(params: Record<string, unknown>): unknown {
  const canvas = getDefaultStore().get(canvasApiAtom);
  if (!canvas) {
    return { error: "canvas not available" };
  }
  const zoom = clampZoom(params.zoom as number);
  canvas.setZoom(zoom);
  return { zoom };
}

export function cameraFitNode(params: Record<string, unknown>): unknown {
  const canvas = getDefaultStore().get(canvasApiAtom);
  if (!canvas) {
    return { error: "canvas not available" };
  }
  const nodeId = params.nodeId as string;
  const doc = getDefaultStore().get(documentAtom);
  const pageId = pageContainingNode(doc, nodeId);
  if (!pageId) {
    return { error: `node ${nodeId} not found` };
  }
  if (pageId !== doc.activePageId) {
    canvas.switchPage(pageId);
  }
  canvas.fitNode(nodeId);
  return { nodeId, pageId };
}

export function selectNodes(params: Record<string, unknown>): unknown {
  const canvas = getDefaultStore().get(canvasApiAtom);
  if (!canvas) {
    return { error: "canvas not available" };
  }
  const doc = getDefaultStore().get(documentAtom);
  const nodeIds = (params.nodeIds as string[] | undefined) ?? [];
  if (nodeIds.length === 0) {
    canvas.deselectAll();
    return { selected: [], pageId: doc.activePageId };
  }

  const pageId = pageContainingNode(doc, nodeIds[0]);
  if (!pageId) {
    return { error: `node ${nodeIds[0]} not found` };
  }
  if (pageId !== doc.activePageId) {
    canvas.switchPage(pageId);
  }

  // Selection is per-page, so keep only the ids that live on the resolved page.
  const onPage = new Set(doc.pages[pageId].nodes.map(n => n.id));
  const selected = nodeIds.filter(id => onPage.has(id));
  canvas.selectOnly(selected);
  return { selected, pageId };
}
