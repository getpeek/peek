import { useReactFlow } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useMemo } from "react";
import {
  canvasApiAtom,
  documentAtom,
  edgesAtom,
  nodesAtom,
  type CanvasApi,
} from "./state";
import { ids } from "./ids";
import type { AppEdge, AppNode } from "./types";

export function useCanvas(): CanvasApi {
  const rf = useReactFlow<AppNode, AppEdge>();
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const [, setDoc] = useAtom(documentAtom);

  return useMemo<CanvasApi>(
    () => ({
      addNode: (node) => setNodes((ns) => [...ns, node]),

      updateNode: (id, patch) =>
        setNodes((ns) =>
          ns.map((n) => {
            if (n.id !== id) return n;
            return typeof patch === "function"
              ? patch(n)
              : ({ ...n, ...patch } as AppNode);
          }),
        ),

      updateNodeData: <D extends object>(
        id: string,
        patch: Partial<D> | ((d: D) => D),
      ) =>
        setNodes((ns) =>
          ns.map((n) => {
            if (n.id !== id) return n;
            const nextData =
              typeof patch === "function"
                ? (patch as (d: D) => D)(n.data as D)
                : { ...(n.data as D), ...patch };
            return { ...n, data: nextData } as AppNode;
          }),
        ),

      deleteNode: (id) => {
        setNodes((ns) => ns.filter((n) => n.id !== id));
        setEdges((es) =>
          es.filter((e) => e.source !== id && e.target !== id),
        );
      },

      connect: (source, target, opts = {}) =>
        setEdges((es) => {
          const id = ids.edge(source, target);
          if (es.some((e) => e.id === id)) return es;
          const next: AppEdge = { id, source, target, ...opts };
          return [...es, next];
        }),

      getNode: (id) => rf.getNode(id) as AppNode | undefined,
      getNodes: () => rf.getNodes() as AppNode[],
      getEdges: () => rf.getEdges() as AppEdge[],
      getSelectedNodes: () =>
        (rf.getNodes() as AppNode[]).filter((n) => n.selected),

      selectOnly: (idOrIds) => {
        const wanted = new Set(
          Array.isArray(idOrIds) ? idOrIds : [idOrIds],
        );
        setNodes((ns) =>
          ns.map((n) =>
            n.selected === wanted.has(n.id)
              ? n
              : ({ ...n, selected: wanted.has(n.id) } as AppNode),
          ),
        );
      },

      deselectAll: () =>
        setNodes((ns) =>
          ns.map((n) =>
            n.selected ? ({ ...n, selected: false } as AppNode) : n,
          ),
        ),

      zoomToNode: (id, opts = {}) => {
        const fit = () =>
          rf.fitView({
            nodes: [{ id }],
            duration: opts.duration ?? 300,
            padding: opts.padding ?? 0.2,
          });
        if (rf.getNode(id)) {
          fit();
        } else {
          requestAnimationFrame(() => {
            if (rf.getNode(id)) fit();
          });
        }
      },

      panToNode: (id, opts = {}) => {
        const center = () => {
          const node = rf.getNode(id);
          if (!node) return;
          const w = node.measured?.width ?? node.width ?? 0;
          const h = node.measured?.height ?? node.height ?? 0;
          rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
            zoom: opts.zoom,
            duration: opts.duration ?? 300,
          });
        };
        if (rf.getNode(id)) {
          center();
        } else {
          requestAnimationFrame(center);
        }
      },

      fitView: (opts = {}) =>
        rf.fitView({ duration: opts.duration ?? 300 }),

      resetZoom: () => rf.zoomTo(1, { duration: 200 }),
      getZoom: () => rf.getZoom(),
      screenToFlowPosition: (p) => rf.screenToFlowPosition(p),

      switchPage: (pageId) =>
        setDoc((d) =>
          d.pages[pageId] ? { ...d, activePageId: pageId } : d,
        ),

      addPage: (name) => {
        const pageId = ids.page();
        setDoc((d) => ({
          ...d,
          pages: {
            ...d.pages,
            [pageId]: {
              id: pageId,
              name: name ?? `Page ${d.pageOrder.length + 1}`,
              nodes: [],
              edges: [],
              viewport: { x: 0, y: 0, zoom: 1 },
            },
          },
          pageOrder: [...d.pageOrder, pageId],
          activePageId: pageId,
        }));
        return pageId;
      },

      renamePage: (pageId, name) =>
        setDoc((d) =>
          d.pages[pageId]
            ? {
                ...d,
                pages: {
                  ...d.pages,
                  [pageId]: { ...d.pages[pageId], name },
                },
              }
            : d,
        ),

      deletePage: (pageId) =>
        setDoc((d) => {
          if (!d.pages[pageId] || d.pageOrder.length <= 1) return d;
          const { [pageId]: _removed, ...rest } = d.pages;
          const order = d.pageOrder.filter((id) => id !== pageId);
          return {
            ...d,
            pages: rest,
            pageOrder: order,
            activePageId:
              d.activePageId === pageId ? order[0] : d.activePageId,
          };
        }),
    }),
    [rf, setNodes, setEdges, setDoc],
  );
}

export function useCanvasApi(): CanvasApi | null {
  const [api] = useAtom(canvasApiAtom);
  return api;
}
