import { atom } from "jotai";
import type {
  AppEdge,
  AppNode,
  AppNodeType,
  CanvasDocument,
  PageState,
  Viewport,
} from "./types";
import { emptyDocument } from "./emptyDocument";

export const documentAtom = atom<CanvasDocument>(emptyDocument());

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
