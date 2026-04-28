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
import type { AppEdge, AppNode, VariableData, VariableNode } from "./types";

export function useCanvas(): CanvasApi {
  const rf = useReactFlow<AppNode, AppEdge>();
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const [, setDoc] = useAtom(documentAtom);

  return useMemo<CanvasApi>(
    () => ({
      addNode: (node) => {
        const globals =
          node.type === "query"
            ? (rf.getNodes() as AppNode[]).filter(
                (n): n is VariableNode =>
                  n.type === "variable" &&
                  (n.data as VariableData).isGlobal === true,
              )
            : [];
        setNodes((ns) => [...ns, node]);
        if (globals.length === 0) return;
        setEdges((es) => {
          let acc = es;
          for (const g of globals) {
            const edgeId = ids.edge(g.id, node.id);
            if (acc.some((e) => e.id === edgeId)) continue;
            acc = [...acc, { id: edgeId, source: g.id, target: node.id }];
          }
          return acc;
        });
      },

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
        const center = () => {
          const node = rf.getNode(id);
          if (!node) return;
          const w = node.measured?.width ?? node.width ?? 0;
          const h = node.measured?.height ?? node.height ?? 0;
          rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
            zoom: 1,
            duration: opts.duration ?? 300,
          });
        };
        if (rf.getNode(id)) {
          center();
        } else {
          requestAnimationFrame(center);
        }
      },

      zoomToNodes: (nodeIds, opts = {}) => {
        if (nodeIds.length === 0) return;
        if (nodeIds.length === 1) {
          const node = rf.getNode(nodeIds[0]);
          if (!node) {
            requestAnimationFrame(() => {
              const n = rf.getNode(nodeIds[0]);
              if (!n) return;
              const w = n.measured?.width ?? n.width ?? 0;
              const h = n.measured?.height ?? n.height ?? 0;
              rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, {
                zoom: 1,
                duration: opts.duration ?? 300,
              });
            });
            return;
          }
          const w = node.measured?.width ?? node.width ?? 0;
          const h = node.measured?.height ?? node.height ?? 0;
          rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
            zoom: 1,
            duration: opts.duration ?? 300,
          });
          return;
        }
        const fit = () =>
          rf.fitView({
            nodes: nodeIds.map((id) => ({ id })),
            duration: opts.duration ?? 300,
            padding: opts.padding ?? 0.2,
          });
        if (nodeIds.every((id) => rf.getNode(id))) {
          fit();
        } else {
          requestAnimationFrame(fit);
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
          const oldIdx = d.pageOrder.indexOf(pageId);
          const order = d.pageOrder.filter((id) => id !== pageId);
          const fallbackIdx = Math.max(0, oldIdx - 1);
          return {
            ...d,
            pages: rest,
            pageOrder: order,
            activePageId:
              d.activePageId === pageId ? order[fallbackIdx] : d.activePageId,
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
