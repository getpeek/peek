import { atom } from "jotai";
import type {
  AppEdge,
  AppNode,
  AppNodeType,
  CanvasDocument,
  PageState,
  Viewport,
} from "./types";
import type { DatabaseResult } from "../state";
import { emptyDocument } from "./emptyDocument";

const _documentBaseAtom = atom<CanvasDocument>(emptyDocument());

// Synchronous gate that suppresses outbound sync emissions while we're
// applying a change received from a remote peer. A ref (not an atom) because
// the documentAtom setter needs to read the latest value within the same
// JS turn — atom propagation through React's render cycle isn't fast enough.
export const isApplyingRemoteRef = { current: false };

export type DocumentMutationListener = (
  prev: CanvasDocument,
  next: CanvasDocument,
) => void;

const _documentMutationListeners = new Set<DocumentMutationListener>();

export function subscribeDocumentMutations(
  fn: DocumentMutationListener,
): () => void {
  _documentMutationListeners.add(fn);
  return () => {
    _documentMutationListeners.delete(fn);
  };
}

export const documentAtom = atom(
  (get) => get(_documentBaseAtom),
  (
    get,
    set,
    updater: CanvasDocument | ((prev: CanvasDocument) => CanvasDocument),
  ) => {
    const prev = get(_documentBaseAtom);
    const next =
      typeof updater === "function"
        ? (updater as (p: CanvasDocument) => CanvasDocument)(prev)
        : updater;
    set(_documentBaseAtom, next);
    if (!isApplyingRemoteRef.current && prev !== next) {
      for (const fn of _documentMutationListeners) {
        try {
          fn(prev, next);
        } catch (e) {
          console.error("documentMutationListener error:", e);
        }
      }
    }
  },
);

// Per-result-node query rows, keyed by result node id. Held out-of-band from
// the canvas document so result data doesn't bloat the persisted JSON file.
// Wrapped in the same middleware pattern as `documentAtom` so the sync bridge
// can diff and push `results/<id>` entries on local writes.
const _resultsBaseAtom = atom<Record<string, DatabaseResult>>({});

export type ResultsMutationListener = (
  prev: Record<string, DatabaseResult>,
  next: Record<string, DatabaseResult>,
) => void;

const _resultsMutationListeners = new Set<ResultsMutationListener>();

export function subscribeResultsMutations(
  fn: ResultsMutationListener,
): () => void {
  _resultsMutationListeners.add(fn);
  return () => {
    _resultsMutationListeners.delete(fn);
  };
}

export const resultsAtom = atom(
  (get) => get(_resultsBaseAtom),
  (
    get,
    set,
    updater:
      | Record<string, DatabaseResult>
      | ((
          prev: Record<string, DatabaseResult>,
        ) => Record<string, DatabaseResult>),
  ) => {
    const prev = get(_resultsBaseAtom);
    const next =
      typeof updater === "function"
        ? (updater as (
            p: Record<string, DatabaseResult>,
          ) => Record<string, DatabaseResult>)(prev)
        : updater;
    set(_resultsBaseAtom, next);
    if (!isApplyingRemoteRef.current && prev !== next) {
      for (const fn of _resultsMutationListeners) {
        try {
          fn(prev, next);
        } catch (e) {
          console.error("resultsMutationListener error:", e);
        }
      }
    }
  },
);

export const activePageAtom = atom<PageState>((get) => {
  const doc = get(documentAtom);
  return doc.pages[doc.activePageId];
});

type Updater<T> = T | ((prev: T) => T);

function applyUpdater<T>(prev: T, updater: Updater<T>): T {
  return typeof updater === "function"
    ? (updater as (p: T) => T)(prev)
    : updater;
}

export const nodesAtom = atom(
  (get) => get(activePageAtom).nodes,
  (get, set, updater: Updater<AppNode[]>) => {
    const doc = get(documentAtom);
    const page = doc.pages[doc.activePageId];
    const next = applyUpdater(page.nodes, updater);
    set(documentAtom, {
      ...doc,
      pages: {
        ...doc.pages,
        [doc.activePageId]: { ...page, nodes: next },
      },
    });
  },
);

export const edgesAtom = atom(
  (get) => get(activePageAtom).edges,
  (get, set, updater: Updater<AppEdge[]>) => {
    const doc = get(documentAtom);
    const page = doc.pages[doc.activePageId];
    const next = applyUpdater(page.edges, updater);
    set(documentAtom, {
      ...doc,
      pages: {
        ...doc.pages,
        [doc.activePageId]: { ...page, edges: next },
      },
    });
  },
);

export const viewportAtom = atom(
  (get) => get(activePageAtom).viewport,
  (get, set, updater: Updater<Viewport>) => {
    const doc = get(documentAtom);
    const page = doc.pages[doc.activePageId];
    const next = applyUpdater(page.viewport, updater);
    set(documentAtom, {
      ...doc,
      pages: {
        ...doc.pages,
        [doc.activePageId]: { ...page, viewport: next },
      },
    });
  },
);

export const placeModeAtom = atom<AppNodeType | null>(null);

export const pendingPageCloseAtom = atom<{ pageId: string } | null>(null);

export const clipboardAtom = atom<AppNode[]>([]);

export type HistorySnapshot = { nodes: AppNode[]; edges: AppEdge[] };
export type PageHistory = { past: HistorySnapshot[]; future: HistorySnapshot[] };

export const historyAtom = atom<Record<string, PageHistory>>({});

export const loadEpochAtom = atom(0);

export interface CanvasApi {
  addNode: (node: AppNode) => void;
  updateNode: (
    id: string,
    patch: Partial<AppNode> | ((n: AppNode) => AppNode),
  ) => void;
  updateNodeData: <D extends object = Record<string, unknown>>(
    id: string,
    patch: Partial<D> | ((d: D) => D),
  ) => void;
  deleteNode: (id: string) => void;
  connect: (source: string, target: string, opts?: Partial<AppEdge>) => void;

  getNode: (id: string) => AppNode | undefined;
  getNodes: () => AppNode[];
  getEdges: () => AppEdge[];
  getSelectedNodes: () => AppNode[];

  selectOnly: (idOrIds: string | string[]) => void;
  deselectAll: () => void;

  zoomToNode: (
    id: string,
    opts?: { duration?: number },
  ) => void;
  zoomToNodes: (
    ids: string[],
    opts?: { duration?: number; padding?: number },
  ) => void;
  panToNode: (id: string, opts?: { duration?: number; zoom?: number }) => void;
  fitView: (opts?: { duration?: number }) => void;
  resetZoom: () => void;
  getZoom: () => number;
  screenToFlowPosition: (p: { x: number; y: number }) => {
    x: number;
    y: number;
  };

  switchPage: (id: string) => void;
  addPage: (name?: string) => string;
  renamePage: (id: string, name: string) => void;
  deletePage: (id: string) => void;
}

export const canvasApiAtom = atom<CanvasApi | null>(null);
