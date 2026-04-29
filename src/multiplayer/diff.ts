import type { AppEdge, AppNode, CanvasDocument, PageState } from "../canvas/types";
import type { DatabaseResult } from "../state";
import type { Operation } from "./types";

function stripNode(n: AppNode): AppNode {
  const {
    selected: _s,
    dragging: _d,
    resizing: _r,
    ...rest
  } = n as AppNode & {
    selected?: boolean;
    dragging?: boolean;
    resizing?: boolean;
  };
  return rest as AppNode;
}

function stripEdge(e: AppEdge): AppEdge {
  const { selected: _s, ...rest } = e as AppEdge & { selected?: boolean };
  return rest as AppEdge;
}

function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

const ACTIVE_PAGE_KEY = "doc/active-page";
const PAGE_ORDER_KEY = "doc/page-order";
export const RESULTS_PREFIX = "results/";
export const EXEC_REQUESTS_PREFIX = "exec-requests/";
export const SCHEMA_INDEX_KEY = "schema/index";

function nodeKey(pageId: string, nodeId: string): string {
  return `pages/${pageId}/nodes/${nodeId}`;
}

function edgeKey(pageId: string, edgeId: string): string {
  return `pages/${pageId}/edges/${edgeId}`;
}

function pageNameKey(pageId: string): string {
  return `pages/${pageId}/name`;
}

export function resultKey(nodeId: string): string {
  return `${RESULTS_PREFIX}${nodeId}`;
}

export function execRequestKey(requestId: string): string {
  return `${EXEC_REQUESTS_PREFIX}${requestId}`;
}

export type KeyKind = "doc" | "result" | "exec-request" | "schema" | "unknown";

export function keyKind(key: string): KeyKind {
  if (key === ACTIVE_PAGE_KEY || key === PAGE_ORDER_KEY) {
    return "doc";
  }
  if (key.startsWith("pages/")) {
    return "doc";
  }
  if (key.startsWith(RESULTS_PREFIX)) {
    return "result";
  }
  if (key.startsWith(EXEC_REQUESTS_PREFIX)) {
    return "exec-request";
  }
  if (key === SCHEMA_INDEX_KEY) {
    return "schema";
  }
  return "unknown";
}

/**
 * Compute the per-key operations needed to converge `prev` to `next`. Skips
 * viewport (per-user) and ephemeral node/edge fields (selected/dragging/resizing).
 *
 * v0 uses whole-node keys for all node types. A future refinement will split
 * query nodes into position/data subkeys to avoid LWW collisions on concurrent
 * drag + SQL-edit.
 */
export function diffDocs(prev: CanvasDocument, next: CanvasDocument): Operation[] {
  const ops: Operation[] = [];

  if (prev.activePageId !== next.activePageId) {
    ops.push({
      kind: "put",
      key: ACTIVE_PAGE_KEY,
      value: encode(next.activePageId),
    });
  }

  const prevOrderJson = JSON.stringify(prev.pageOrder);
  const nextOrderJson = JSON.stringify(next.pageOrder);
  if (prevOrderJson !== nextOrderJson) {
    ops.push({ kind: "put", key: PAGE_ORDER_KEY, value: encode(nextOrderJson) });
  }

  // Page deletions: emit deletions for the removed page's nodes/edges/name.
  for (const pageId of Object.keys(prev.pages)) {
    if (next.pages[pageId]) {
      continue;
    }
    const prevPage = prev.pages[pageId];
    for (const node of prevPage.nodes) {
      ops.push({ kind: "del", key: nodeKey(pageId, node.id) });
    }
    for (const edge of prevPage.edges) {
      ops.push({ kind: "del", key: edgeKey(pageId, edge.id) });
    }
    ops.push({ kind: "del", key: pageNameKey(pageId) });
  }

  for (const [pageId, nextPage] of Object.entries(next.pages)) {
    const prevPage = prev.pages[pageId];

    if (!prevPage || prevPage.name !== nextPage.name) {
      ops.push({
        kind: "put",
        key: pageNameKey(pageId),
        value: encode(nextPage.name),
      });
    }

    diffNodes(pageId, prevPage, nextPage, ops);
    diffEdges(pageId, prevPage, nextPage, ops);
  }

  return ops;
}

function diffNodes(
  pageId: string,
  prevPage: PageState | undefined,
  nextPage: PageState,
  ops: Operation[],
): void {
  const prevById = new Map<string, AppNode>((prevPage?.nodes ?? []).map((n) => [n.id, n]));
  const nextById = new Map<string, AppNode>(nextPage.nodes.map((n) => [n.id, n]));

  for (const [nodeId] of prevById) {
    if (!nextById.has(nodeId)) {
      ops.push({ kind: "del", key: nodeKey(pageId, nodeId) });
    }
  }

  for (const [nodeId, nextNode] of nextById) {
    const prevNode = prevById.get(nodeId);
    const stripped = stripNode(nextNode);
    if (!prevNode || JSON.stringify(stripNode(prevNode)) !== JSON.stringify(stripped)) {
      ops.push({
        kind: "put",
        key: nodeKey(pageId, nodeId),
        value: encode(JSON.stringify(stripped)),
      });
    }
  }
}

function diffEdges(
  pageId: string,
  prevPage: PageState | undefined,
  nextPage: PageState,
  ops: Operation[],
): void {
  const prevById = new Map<string, AppEdge>((prevPage?.edges ?? []).map((e) => [e.id, e]));
  const nextById = new Map<string, AppEdge>(nextPage.edges.map((e) => [e.id, e]));

  for (const [edgeId] of prevById) {
    if (!nextById.has(edgeId)) {
      ops.push({ kind: "del", key: edgeKey(pageId, edgeId) });
    }
  }

  for (const [edgeId, nextEdge] of nextById) {
    const prevEdge = prevById.get(edgeId);
    const stripped = stripEdge(nextEdge);
    if (!prevEdge || JSON.stringify(stripEdge(prevEdge)) !== JSON.stringify(stripped)) {
      ops.push({
        kind: "put",
        key: edgeKey(pageId, edgeId),
        value: encode(JSON.stringify(stripped)),
      });
    }
  }
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

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

/**
 * Compute the per-key operations needed to converge result rows from `prev`
 * to `next`. Each result-node id is one entry under `results/<nodeId>`.
 */
export function diffResults(
  prev: Record<string, DatabaseResult>,
  next: Record<string, DatabaseResult>,
): Operation[] {
  const ops: Operation[] = [];

  for (const id of Object.keys(prev)) {
    if (!(id in next)) {
      ops.push({ kind: "del", key: resultKey(id) });
    }
  }

  for (const [id, rows] of Object.entries(next)) {
    const prevRows = prev[id];
    if (!prevRows || JSON.stringify(prevRows) !== JSON.stringify(rows)) {
      ops.push({
        kind: "put",
        key: resultKey(id),
        value: encode(JSON.stringify(rows)),
      });
    }
  }

  return ops;
}

/**
 * Apply a `results/<id>` operation to a results map.
 */
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

/**
 * Lower an entire results map to a flat list of put operations — used during
 * the host's initial session push.
 */
export function resultsToPuts(results: Record<string, DatabaseResult>): Operation[] {
  return Object.entries(results).map(([id, rows]) => ({
    kind: "put" as const,
    key: resultKey(id),
    value: encode(JSON.stringify(rows)),
  }));
}

/**
 * Lower an entire document to a flat list of `put` operations — used when a
 * host starts a session and needs to push its existing canvas state to a doc
 * that was just created empty. `diffDocs` alone only fires on *future* writes.
 */
export function documentToPuts(doc: CanvasDocument): Operation[] {
  const ops: Operation[] = [];
  ops.push({ kind: "put", key: ACTIVE_PAGE_KEY, value: encode(doc.activePageId) });
  ops.push({
    kind: "put",
    key: PAGE_ORDER_KEY,
    value: encode(JSON.stringify(doc.pageOrder)),
  });
  for (const [pageId, page] of Object.entries(doc.pages)) {
    ops.push({
      kind: "put",
      key: pageNameKey(pageId),
      value: encode(page.name),
    });
    for (const node of page.nodes) {
      ops.push({
        kind: "put",
        key: nodeKey(pageId, node.id),
        value: encode(JSON.stringify(stripNode(node))),
      });
    }
    for (const edge of page.edges) {
      ops.push({
        kind: "put",
        key: edgeKey(pageId, edge.id),
        value: encode(JSON.stringify(stripEdge(edge))),
      });
    }
  }
  return ops;
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
        if (Array.isArray(parsed) && parsed.every((p) => typeof p === "string")) {
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
        return updatePage(next, pageId, (p) => ({ ...p, name: value }));
      }
      if (parts[2] === "nodes" && parts.length === 4) {
        const nodeId = parts[3];
        try {
          const parsed = JSON.parse(value) as AppNode;
          if (parsed.id !== nodeId) {
            return doc;
          }
          const next = ensurePage(doc, pageId);
          return updatePage(next, pageId, (p) => {
            const idx = p.nodes.findIndex((n) => n.id === nodeId);
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
      if (parts[2] === "edges" && parts.length === 4) {
        const edgeId = parts[3];
        try {
          const parsed = JSON.parse(value) as AppEdge;
          if (parsed.id !== edgeId) {
            return doc;
          }
          const next = ensurePage(doc, pageId);
          return updatePage(next, pageId, (p) => {
            const idx = p.edges.findIndex((e) => e.id === edgeId);
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
      const order = doc.pageOrder.filter((p) => p !== pageId);
      const active =
        doc.activePageId === pageId ? (order[0] ?? doc.activePageId) : doc.activePageId;
      return { ...doc, pages: rest, pageOrder: order, activePageId: active };
    }
    if (parts[2] === "nodes" && parts.length === 4) {
      const nodeId = parts[3];
      return updatePage(doc, pageId, (p) => ({
        ...p,
        nodes: p.nodes.filter((n) => n.id !== nodeId),
      }));
    }
    if (parts[2] === "edges" && parts.length === 4) {
      const edgeId = parts[3];
      return updatePage(doc, pageId, (p) => ({
        ...p,
        edges: p.edges.filter((e) => e.id !== edgeId),
      }));
    }
  }
  return doc;
}
