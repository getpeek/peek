import { IconLayoutGrid } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, nodesAtom } from "../../canvas/state";
import {
  runForceDirectedLayout,
  type FDGInputEdge,
  type FDGInputNode,
} from "../../canvas/forceDirectedLayout";
import type { AppNode } from "../../canvas/types";
import type { CommandPaletteResult } from "./index";

const FALLBACK_W = 400;
const FALLBACK_H = 300;

const nodeWidth = (n: AppNode) => n.measured?.width ?? n.width ?? FALLBACK_W;
const nodeHeight = (n: AppNode) => n.measured?.height ?? n.height ?? FALLBACK_H;

export const useOrganizeCanvasCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const setNodes = useSetAtom(nodesAtom);

  return {
    icon: <IconLayoutGrid size={16} />,
    label: "Organize canvas",
    description: "Arrange nodes by their connections",
    searchAgainst: "layout auto force directed graph fit",
    onSelect: () => {
      if (!canvas) {
        return;
      }
      const nodes = canvas.getNodes();
      if (nodes.length < 2) {
        canvas.fitView({ duration: 300 });
        return;
      }
      const edges = canvas.getEdges();

      const inputNodes: FDGInputNode[] = nodes.map(n => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        width: nodeWidth(n),
        height: nodeHeight(n),
      }));
      const inputEdges: FDGInputEdge[] = edges.map(e => ({
        source: e.source,
        target: e.target,
      }));

      const positions = runForceDirectedLayout(inputNodes, inputEdges);

      setNodes(ns =>
        ns.map(n => {
          const p = positions.get(n.id);
          if (!p) {
            return n;
          }
          if (p.x === n.position.x && p.y === n.position.y) {
            return n;
          }
          return { ...n, position: p };
        }),
      );

      requestAnimationFrame(() => canvas.fitView({ duration: 300 }));
    },
  };
};
