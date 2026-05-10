import { IconLayoutGrid } from "@tabler/icons-react";
import type { Simulation } from "d3-force";
import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, nodesAtom } from "../../canvas/state";
import {
  buildForceSimulation,
  PADDING,
  rectCollide,
  type SimLink,
  type SimNode,
} from "../../canvas/forceDirectedLayout";
import type { AppNode } from "../../canvas/types";
import type { CommandPaletteResult } from "./index";

const FALLBACK_W = 400;
const FALLBACK_H = 300;
const ANIMATED_ALPHA_DECAY = 0.07;
const FIT_EVERY_TICKS = 8;
const FIT_DURATION_MS = 200;
const POST_SETTLE_ITERATIONS = 8;

const nodeWidth = (n: AppNode) => n.measured?.width ?? n.width ?? FALLBACK_W;
const nodeHeight = (n: AppNode) => n.measured?.height ?? n.height ?? FALLBACK_H;

let currentSim: Simulation<SimNode, SimLink> | null = null;

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

      currentSim?.stop();

      const sizeById = new Map<string, { w: number; h: number }>();
      const simNodes: SimNode[] = nodes.map(n => {
        const w = nodeWidth(n);
        const h = nodeHeight(n);
        sizeById.set(n.id, { w, h });
        return {
          id: n.id,
          width: w,
          height: h,
          x: n.position.x + w / 2,
          y: n.position.y + h / 2,
        };
      });

      const presentIds = new Set(simNodes.map(n => n.id));
      const simLinks: SimLink[] = canvas
        .getEdges()
        .filter(e => presentIds.has(e.source) && presentIds.has(e.target))
        .map(e => ({ source: e.source, target: e.target }));

      const sim = buildForceSimulation(simNodes, simLinks, {
        alphaDecay: ANIMATED_ALPHA_DECAY,
        collisionIterations: 4,
      });
      const simNodeById = new Map(simNodes.map(n => [n.id, n]));
      currentSim = sim;
      let tickCount = 0;

      sim.on("tick", () => {
        setNodes(ns => {
          let mutated = false;
          const next = ns.map(n => {
            const sn = simNodeById.get(n.id);
            const size = sizeById.get(n.id);
            if (!sn || !size) {
              return n;
            }
            const x = (sn.x ?? 0) - size.w / 2;
            const y = (sn.y ?? 0) - size.h / 2;
            if (x === n.position.x && y === n.position.y) {
              return n;
            }
            mutated = true;
            return { ...n, position: { x, y } };
          });
          return mutated ? next : ns;
        });

        tickCount++;
        if (tickCount % FIT_EVERY_TICKS === 0) {
          canvas.fitView({ duration: FIT_DURATION_MS });
        }
      });

      sim.on("end", () => {
        if (currentSim === sim) {
          currentSim = null;
        }

        const settle = rectCollide<SimNode>(PADDING, POST_SETTLE_ITERATIONS);
        settle.initialize(simNodes);
        settle(1);

        setNodes(ns => {
          let mutated = false;
          const next = ns.map(n => {
            const sn = simNodeById.get(n.id);
            const size = sizeById.get(n.id);
            if (!sn || !size) {
              return n;
            }
            const x = (sn.x ?? 0) - size.w / 2;
            const y = (sn.y ?? 0) - size.h / 2;
            if (x === n.position.x && y === n.position.y) {
              return n;
            }
            mutated = true;
            return { ...n, position: { x, y } };
          });
          return mutated ? next : ns;
        });

        canvas.fitView({ duration: 400 });
      });

      canvas.fitView({ duration: FIT_DURATION_MS });
    },
  };
};
