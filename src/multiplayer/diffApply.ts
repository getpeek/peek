import type { AppEdge, AppNode, CanvasDocument, PageState } from "../canvas/types";
import type { DatabaseResult } from "../state";
import type { Operation } from "./types";

const RESULTS_PREFIX = "results/";

const ACTIVE_PAGE_KEY = "doc/active-page";
const PAGE_ORDER_KEY = "doc/page-order";
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function ensurePage(doc: CanvasDocument, pageId: string): CanvasDocument {
  if (doc.pages[pageId]) {
    return doc;
  }
  return {
    ...doc,
    pages: {
      ...doc.pages,
      [pageId]: {
        id: pageId,
        name: "",
        nodes: [],
        edges: [],
        viewport: { ...DEFAULT_VIEWPORT },
      },
    },
  };
}

function updatePage(
  doc: CanvasDocument,
  pageId: string,
  fn: (page: PageState) => PageState,
): CanvasDocument {
  const page = doc.pages[pageId];
  if (!page) {
    return doc;
  }
  return { ...doc, pages: { ...doc.pages, [pageId]: fn(page) } };
}

function applyNodePut(
  doc: CanvasDocument,
  pageId: string,
  nodeId: string,
  value: string,
): CanvasDocument {
  try {
    const parsed = JSON.parse(value) as AppNode;
    if (parsed.id !== nodeId) {
      return doc;
    }
    const next = ensurePage(doc, pageId);
    return updatePage(next, pageId, p => {
      const idx = p.nodes.findIndex(n => n.id === nodeId);
      if (idx === -1) {
        return { ...p, nodes: [...p.nodes, parsed] };
      }
      const nodes = p.nodes.slice();
      nodes[idx] = parsed;
      return { ...p, nodes };
    });
  } catch {
    return doc;
  }
}

function applyEdgePut(
  doc: CanvasDocument,
  pageId: string,
  edgeId: string,
  value: string,
): CanvasDocument {
  try {
    const parsed = JSON.parse(value) as AppEdge;
    if (parsed.id !== edgeId) {
      return doc;
    }
    const next = ensurePage(doc, pageId);
    return updatePage(next, pageId, p => {
      const idx = p.edges.findIndex(e => e.id === edgeId);
      if (idx === -1) {
        return { ...p, edges: [...p.edges, parsed] };
      }
      const edges = p.edges.slice();
      edges[idx] = parsed;
      return { ...p, edges };
    });
  } catch {
    return doc;
  }
}

export function applyResultOperation(
  results: Record<string, DatabaseResult>,
  op: Operation,
): Record<string, DatabaseResult> {
  if (!op.key.startsWith(RESULTS_PREFIX)) {
    return results;
  }
  const id = op.key.slice(RESULTS_PREFIX.length);
  if (op.kind === "del") {
    if (!(id in results)) {
      return results;
    }
    const { [id]: _removed, ...rest } = results;
    return rest;
  }
  try {
    const rows = JSON.parse(decode(op.value)) as DatabaseResult;
    if (!Array.isArray(rows)) {
      return results;
    }
    return { ...results, [id]: rows };
  } catch {
    return results;
  }
}

export function applyOperation(doc: CanvasDocument, op: Operation): CanvasDocument {
  if (op.kind === "put") {
    const value = decode(op.value);
    if (op.key === ACTIVE_PAGE_KEY) {
      return doc.pages[value] ? { ...doc, activePageId: value } : doc;
    }
    if (op.key === PAGE_ORDER_KEY) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.every(p => typeof p === "string")) {
          return { ...doc, pageOrder: parsed };
        }
      } catch {
        // ignore malformed
      }
      return doc;
    }
    const parts = op.key.split("/");
    if (parts[0] === "pages" && parts.length >= 3) {
      const pageId = parts[1];
      if (parts[2] === "name" && parts.length === 3) {
        const next = ensurePage(doc, pageId);
        return updatePage(next, pageId, p => ({ ...p, name: value }));
      }
      if (parts[2] === "nodes" && parts.length === 4) {
        return applyNodePut(doc, pageId, parts[3], value);
      }
      if (parts[2] === "edges" && parts.length === 4) {
        return applyEdgePut(doc, pageId, parts[3], value);
      }
    }
    return doc;
  }

  // del
  const parts = op.key.split("/");
  if (parts[0] === "pages" && parts.length >= 3) {
    const pageId = parts[1];
    if (parts[2] === "name" && parts.length === 3) {
      // Tombstone-ish: delete the page entirely.
      if (!doc.pages[pageId]) {
        return doc;
      }
      const { [pageId]: _removed, ...rest } = doc.pages;
      const order = doc.pageOrder.filter(p => p !== pageId);
      const active =
        doc.activePageId === pageId ? (order[0] ?? doc.activePageId) : doc.activePageId;
      return { ...doc, pages: rest, pageOrder: order, activePageId: active };
    }
    if (parts[2] === "nodes" && parts.length === 4) {
      const nodeId = parts[3];
      return updatePage(doc, pageId, p => ({
        ...p,
        nodes: p.nodes.filter(n => n.id !== nodeId),
      }));
    }
    if (parts[2] === "edges" && parts.length === 4) {
      const edgeId = parts[3];
      return updatePage(doc, pageId, p => ({
        ...p,
        edges: p.edges.filter(e => e.id !== edgeId),
      }));
    }
  }
  return doc;
}
