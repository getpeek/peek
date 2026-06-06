import { getDefaultStore } from "jotai";
import { documentAtom } from "../canvas/state";
import { ids } from "../canvas/ids";
import type { TextNode } from "../canvas/types";
import {
  type MutationResult,
  pageContainingNode,
  patchNode,
  placeNode,
  resolvePageId,
} from "./createNodes";

// A text node has no settable width — it starts narrow and the renderer grows it
// to fit the (single-line) text, so we seed a small width and let it expand.
const TEXT_NODE_INITIAL_WIDTH = 100;

export function createTextNode(params: Record<string, unknown>): MutationResult {
  const doc = getDefaultStore().get(documentAtom);
  const pageId = resolvePageId(doc, params.pageId);
  if (!pageId) {
    return { error: `page ${String(params.pageId)} not found` };
  }

  const [x, y] = params.position as [number, number];
  const node: TextNode = {
    id: ids.text(),
    type: "text",
    position: { x, y },
    width: TEXT_NODE_INITIAL_WIDTH,
    height: params.height as number,
    data: { text: params.text as string },
  };

  return placeNode(pageId, node, []);
}

export function updateTextNode(params: Record<string, unknown>): MutationResult {
  const nodeId = params.nodeId as string;
  const doc = getDefaultStore().get(documentAtom);
  const pageId = pageContainingNode(doc, nodeId);
  if (!pageId) {
    return { error: `node ${nodeId} not found` };
  }
  const node = doc.pages[pageId].nodes.find(n => n.id === nodeId);
  if (!node || node.type !== "text") {
    return { error: `node ${nodeId} is not a text node` };
  }

  return patchNode(pageId, nodeId, n => {
    const next = { ...n } as TextNode;
    if (Array.isArray(params.position)) {
      const [x, y] = params.position as [number, number];
      next.position = { x, y };
    }
    if (typeof params.height === "number") {
      next.height = params.height;
    }
    if (params.text !== undefined) {
      next.data = { ...next.data, text: params.text as string };
    }
    return next;
  });
}
