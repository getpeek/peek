import { useReactFlow } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useMemo } from "react";
import { canvasApiAtom, documentAtom, edgesAtom, nodesAtom, type CanvasApi } from "../state";
import { ids } from "../ids";
import type { AppEdge, AppNode, VariableData, VariableNode } from "../types";
import { computeViewportFit } from "./bspTiles";

// React Flow's node lookup lags the jotai nodes atom by a render or two, so a node
// added this tick can be missing from rf.getNode for a few frames. Poll until the
// target registers before framing it — a single retry sometimes fires too early,
// which is why freshly spawned nodes occasionally never got panned to.
function fitWhenReady(isReady: () => boolean, frame: () => void, attempts = 12): void {
  if (isReady()) {
    frame();
    return;
  }
  if (attempts <= 0) {
    return;
  }
  requestAnimationFrame(() => fitWhenReady(isReady, frame, attempts - 1));
}

export function useCanvas(): CanvasApi {
  const rf = useReactFlow<AppNode, AppEdge>();
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  // Setter only — subscribing here (useAtom) re-rendered every useCanvas consumer
  // on every document mutation, i.e. on every node-drag tick across the canvas.
  const setDoc = useSetAtom(documentAtom);

  return useMemo<CanvasApi>(
    () => ({
      addNode: node => {
        const globals =
          node.type === "query"
            ? (rf.getNodes() as AppNode[]).filter(
                (n): n is VariableNode =>
                  n.type === "variable" && (n.data as VariableData).isGlobal === true,
              )
            : [];
        setNodes(ns => [...ns, node]);
        if (globals.length === 0) {
          return;
        }
        setEdges(es => {
          let acc = es;
          for (const g of globals) {
            const edgeId = ids.edge(g.id, node.id);
            if (acc.some(e => e.id === edgeId)) {
              continue;
            }
            acc = [...acc, { id: edgeId, source: g.id, target: node.id }];
          }
          return acc;
        });
      },

      updateNode: (id, patch) =>
        setNodes(ns =>
          ns.map(n => {
            if (n.id !== id) {
              return n;
            }
            return typeof patch === "function" ? patch(n) : ({ ...n, ...patch } as AppNode);
          }),
        ),

      updateNodeData: <D extends object>(id: string, patch: Partial<D> | ((d: D) => D)) =>
        setNodes(ns =>
          ns.map(n => {
            if (n.id !== id) {
              return n;
            }
            const nextData =
              typeof patch === "function"
                ? (patch as (d: D) => D)(n.data as D)
                : { ...(n.data as D), ...patch };
            return { ...n, data: nextData } as AppNode;
          }),
        ),

      deleteNode: id => {
        setNodes(ns => ns.filter(n => n.id !== id));
        setEdges(es => es.filter(e => e.source !== id && e.target !== id));
      },

      connect: (source, target, opts = {}) =>
        setEdges(es => {
          const id = ids.edge(source, target);
          if (es.some(e => e.id === id)) {
            return es;
          }
          const next: AppEdge = { id, source, target, ...opts };
          return [...es, next];
        }),

      getNode: id => rf.getNode(id) as AppNode | undefined,
      getNodes: () => rf.getNodes() as AppNode[],
      getEdges: () => rf.getEdges() as AppEdge[],
      getSelectedNodes: () => (rf.getNodes() as AppNode[]).filter(n => n.selected),

      selectOnly: idOrIds => {
        const wanted = new Set(Array.isArray(idOrIds) ? idOrIds : [idOrIds]);
        setNodes(ns =>
          ns.map(n =>
            n.selected === wanted.has(n.id) ? n : ({ ...n, selected: wanted.has(n.id) } as AppNode),
          ),
        );
      },

      deselectAll: () =>
        setNodes(ns => ns.map(n => (n.selected ? ({ ...n, selected: false } as AppNode) : n))),

      zoomToNode: (id, opts = {}) => {
        const center = () => {
          const node = rf.getNode(id);
          if (!node) {
            return;
          }
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
        if (nodeIds.length === 0) {
          return;
        }
        fitWhenReady(
          () => nodeIds.every(id => rf.getNode(id)),
          () =>
            rf.fitView({
              nodes: nodeIds.map(id => ({ id })),
              duration: opts.duration ?? 300,
              padding: opts.padding ?? 0.2,
              maxZoom: 1,
            }),
        );
      },

      fitNode: (id, opts = {}) =>
        fitWhenReady(
          () => Boolean(rf.getNode(id)),
          () =>
            rf.fitView({
              nodes: [{ id }],
              duration: opts.duration ?? 300,
              padding: 0.2,
              maxZoom: 1,
            }),
        ),

      panToNode: (id, opts = {}) => {
        const center = () => {
          const node = rf.getNode(id);
          if (!node) {
            return;
          }
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

      panToPoint: (x, y, opts = {}) => {
        rf.setCenter(x, y, { zoom: opts.zoom, duration: opts.duration ?? 300 });
      },

      fitView: (opts = {}) =>
        rf.fitView({ duration: opts.duration ?? 300, maxZoom: opts.maxZoom ?? 1 }),

      fitSelectedToViewport: () => {
        const selected = (rf.getNodes() as AppNode[]).filter(n => n.selected);
        if (selected.length === 0) {
          return;
        }
        const paneRect = document
          .querySelector<HTMLElement>(".react-flow")
          ?.getBoundingClientRect();
        const { placements, viewport } = computeViewportFit(
          selected.map(n => n.id),
          paneRect,
          p => rf.screenToFlowPosition(p),
        );

        const rectById = new Map(placements.map(p => [p.id, p.rect]));
        setNodes(ns =>
          ns.map(n => {
            const r = rectById.get(n.id);
            if (!r) {
              return n;
            }
            const { x, y, width, height } = r;
            return { ...n, position: { x, y }, width, height } as AppNode;
          }),
        );

        // onMoveEnd persists this to viewportAtom, matching zoomToNode/resetZoom.
        rf.setViewport(viewport, { duration: 200 });
      },

      resetZoom: () => rf.zoomTo(1, { duration: 200 }),
      setZoom: (zoom, opts = {}) => rf.zoomTo(zoom, { duration: opts.duration ?? 200 }),
      getZoom: () => rf.getZoom(),
      screenToFlowPosition: p => rf.screenToFlowPosition(p),

      switchPage: pageId => setDoc(d => (d.pages[pageId] ? { ...d, activePageId: pageId } : d)),

      addPage: name => {
        const pageId = ids.page();
        setDoc(d => ({
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
        setDoc(d =>
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

      deletePage: pageId =>
        setDoc(d => {
          if (!d.pages[pageId] || d.pageOrder.length <= 1) {
            return d;
          }
          const { [pageId]: _removed, ...rest } = d.pages;
          const oldIdx = d.pageOrder.indexOf(pageId);
          const order = d.pageOrder.filter(id => id !== pageId);
          const fallbackIdx = Math.max(0, oldIdx - 1);
          return {
            ...d,
            pages: rest,
            pageOrder: order,
            activePageId: d.activePageId === pageId ? order[fallbackIdx] : d.activePageId,
          };
        }),

      reorderPage: (pageId, toIndex) =>
        setDoc(d => {
          const fromIdx = d.pageOrder.indexOf(pageId);
          if (fromIdx === -1) {
            return d;
          }
          const clamped = Math.max(0, Math.min(toIndex, d.pageOrder.length - 1));
          if (clamped === fromIdx) {
            return d;
          }
          const next = d.pageOrder.slice();
          next.splice(fromIdx, 1);
          next.splice(clamped, 0, pageId);
          return { ...d, pageOrder: next };
        }),
    }),
    [rf, setNodes, setEdges, setDoc],
  );
}

export function useCanvasApi(): CanvasApi | null {
  const [api] = useAtom(canvasApiAtom);
  return api;
}
