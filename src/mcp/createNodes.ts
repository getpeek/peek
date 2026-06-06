import { getDefaultStore } from "jotai";
import { documentAtom } from "../canvas/state";
import { ids } from "../canvas/ids";
import { VARIABLE_NAME_RE } from "../canvas/variables";
import type {
  AppEdge,
  AppNode,
  CanvasDocument,
  QueryNode,
  VariableData,
  VariableNode,
  VariableRow,
} from "../canvas/types";

export type MutationResult = { nodeId: string; pageId: string } | { error: string };
type ConnectResult = { edgeId: string; pageId: string } | { error: string };

export function resolvePageId(doc: CanvasDocument, raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return doc.activePageId;
  }
  return typeof raw === "string" && doc.pages[raw] ? raw : null;
}

export function pageContainingNode(doc: CanvasDocument, nodeId: string): string | null {
  for (const pageId of doc.pageOrder) {
    if (doc.pages[pageId].nodes.some(n => n.id === nodeId)) {
      return pageId;
    }
  }
  return null;
}

// Reveals the target page and appends the node (plus any edges) in a single
// atomic document write, so autosave and remote-sync fire from one mutation.
// We write the document directly rather than calling canvas.addNode because the
// target page may not be the active one — its nodes aren't in React Flow's live
// store yet, so addNode's global-edge detection would read the wrong page.
export function placeNode(
  pageId: string,
  node: AppNode,
  edges: AppEdge[],
): { nodeId: string; pageId: string } {
  getDefaultStore().set(documentAtom, doc => {
    const page = doc.pages[pageId];
    return {
      ...doc,
      activePageId: pageId,
      pages: {
        ...doc.pages,
        [pageId]: { ...page, nodes: [...page.nodes, node], edges: [...page.edges, ...edges] },
      },
    };
  });
  return { nodeId: node.id, pageId };
}

export function createQueryNode(params: Record<string, unknown>): MutationResult {
  const doc = getDefaultStore().get(documentAtom);
  const pageId = resolvePageId(doc, params.pageId);
  if (!pageId) {
    return { error: `page ${String(params.pageId)} not found` };
  }

  const [x, y] = params.position as [number, number];
  const [width, height] = params.size as [number, number];
  const node: QueryNode = {
    id: ids.query(),
    type: "query",
    position: { x, y },
    width,
    height,
    data: { query: params.query as string },
  };

  // A global variable node applies to a query only through an edge, so connect
  // the new query to every global on the page (mirrors canvas.addNode).
  const edges: AppEdge[] = doc.pages[pageId].nodes
    .filter(
      (n): n is VariableNode => n.type === "variable" && (n.data as VariableData).isGlobal === true,
    )
    .map(g => ({ id: ids.edge(g.id, node.id), source: g.id, target: node.id }));

  return placeNode(pageId, node, edges);
}

// Edges live within a page, so both endpoints must sit on the same page. We
// don't change the active page here — unlike node creation, connecting acts on
// nodes that already exist wherever the user left them.
export function connectNodes(params: Record<string, unknown>): ConnectResult {
  const from = params.from as string;
  const to = params.to as string;
  if (from === to) {
    return { error: "cannot connect a node to itself" };
  }

  const doc = getDefaultStore().get(documentAtom);
  const fromPage = pageContainingNode(doc, from);
  const toPage = pageContainingNode(doc, to);
  if (!fromPage) {
    return { error: `node ${from} not found` };
  }
  if (!toPage) {
    return { error: `node ${to} not found` };
  }
  if (fromPage !== toPage) {
    return { error: `nodes are on different pages (${fromPage}, ${toPage})` };
  }

  const edgeId = ids.edge(from, to);
  if (doc.pages[fromPage].edges.some(e => e.id === edgeId)) {
    return { edgeId, pageId: fromPage };
  }

  const edge: AppEdge = { id: edgeId, source: from, target: to };
  getDefaultStore().set(documentAtom, d => {
    const page = d.pages[fromPage];
    return {
      ...d,
      pages: { ...d.pages, [fromPage]: { ...page, edges: [...page.edges, edge] } },
    };
  });
  return { edgeId, pageId: fromPage };
}

export function createVarsNode(params: Record<string, unknown>): MutationResult {
  const doc = getDefaultStore().get(documentAtom);
  const pageId = resolvePageId(doc, params.pageId);
  if (!pageId) {
    return { error: `page ${String(params.pageId)} not found` };
  }

  const variables = params.variables as Record<string, string | string[]>;
  const rows: VariableRow[] = Object.entries(variables).map(([name, value]) => ({ name, value }));
  if (rows.length === 0) {
    return { error: "variables map is empty" };
  }
  const invalid = rows.find(r => !VARIABLE_NAME_RE.test(r.name));
  if (invalid) {
    return { error: `invalid variable name: ${invalid.name}` };
  }

  const [x, y] = params.position as [number, number];
  const [width, height] = params.size as [number, number];
  const isGlobal = params.global === true;
  const node: VariableNode = {
    id: ids.variable(),
    type: "variable",
    position: { x, y },
    width,
    height,
    data: { rows, isGlobal },
  };

  // A global variable node applies to queries only through edges, so wire it to
  // every existing query on the page (mirrors the VariableNode global toggle).
  const edges: AppEdge[] = isGlobal
    ? doc.pages[pageId].nodes
        .filter(n => n.type === "query")
        .map(q => ({ id: ids.edge(node.id, q.id), source: node.id, target: q.id }))
    : [];

  return placeNode(pageId, node, edges);
}

// Patches one existing node (and optionally appends edges) on a known page in a
// single document write. Unlike placeNode it leaves activePageId alone — an
// update acts on a node wherever the user left it without yanking the view.
export function patchNode(
  pageId: string,
  nodeId: string,
  patch: (node: AppNode) => AppNode,
  newEdges: AppEdge[] = [],
): { nodeId: string; pageId: string } {
  getDefaultStore().set(documentAtom, doc => {
    const page = doc.pages[pageId];
    return {
      ...doc,
      pages: {
        ...doc.pages,
        [pageId]: {
          ...page,
          nodes: page.nodes.map(n => (n.id === nodeId ? patch(n) : n)),
          edges: newEdges.length > 0 ? [...page.edges, ...newEdges] : page.edges,
        },
      },
    };
  });
  return { nodeId, pageId };
}

// Position and size are optional on update; only the provided ones are applied.
function geometryPatch(params: Record<string, unknown>): Partial<AppNode> {
  const patch: Partial<AppNode> = {};
  if (Array.isArray(params.position)) {
    const [x, y] = params.position as [number, number];
    patch.position = { x, y };
  }
  if (Array.isArray(params.size)) {
    const [width, height] = params.size as [number, number];
    patch.width = width;
    patch.height = height;
  }
  return patch;
}

export function updateQueryNode(params: Record<string, unknown>): MutationResult {
  const nodeId = params.nodeId as string;
  const doc = getDefaultStore().get(documentAtom);
  const pageId = pageContainingNode(doc, nodeId);
  if (!pageId) {
    return { error: `node ${nodeId} not found` };
  }
  const node = doc.pages[pageId].nodes.find(n => n.id === nodeId);
  if (!node || node.type !== "query") {
    return { error: `node ${nodeId} is not a query node` };
  }

  return patchNode(pageId, nodeId, n => {
    const next = { ...n, ...geometryPatch(params) } as QueryNode;
    if (params.query !== undefined) {
      next.data = { ...next.data, query: params.query as string };
    }
    return next;
  });
}

export function updateVarsNode(params: Record<string, unknown>): MutationResult {
  const nodeId = params.nodeId as string;
  const doc = getDefaultStore().get(documentAtom);
  const pageId = pageContainingNode(doc, nodeId);
  if (!pageId) {
    return { error: `node ${nodeId} not found` };
  }
  const node = doc.pages[pageId].nodes.find(n => n.id === nodeId);
  if (!node || node.type !== "variable") {
    return { error: `node ${nodeId} is not a variable node` };
  }

  let rows: VariableRow[] | undefined;
  if (params.variables !== undefined) {
    const variables = params.variables as Record<string, string | string[]>;
    rows = Object.entries(variables).map(([name, value]) => ({ name, value }));
    if (rows.length === 0) {
      return { error: "variables map is empty" };
    }
    const invalid = rows.find(r => !VARIABLE_NAME_RE.test(r.name));
    if (invalid) {
      return { error: `invalid variable name: ${invalid.name}` };
    }
  }

  // Turning global on wires the node to every query on the page (idempotent, so
  // dedupe against existing edges); turning it off leaves edges, mirroring the
  // in-app toggle which never tears them down.
  const page = doc.pages[pageId];
  const newEdges: AppEdge[] =
    params.global === true
      ? page.nodes
          .filter(n => n.type === "query")
          .map(q => ({ id: ids.edge(nodeId, q.id), source: nodeId, target: q.id }))
          .filter(e => !page.edges.some(existing => existing.id === e.id))
      : [];

  return patchNode(
    pageId,
    nodeId,
    n => {
      const next = { ...n, ...geometryPatch(params) } as VariableNode;
      const data: VariableData = { ...next.data };
      if (rows) {
        data.rows = rows;
      }
      if (params.global !== undefined) {
        data.isGlobal = params.global === true;
      }
      next.data = data;
      return next;
    },
    newEdges,
  );
}
