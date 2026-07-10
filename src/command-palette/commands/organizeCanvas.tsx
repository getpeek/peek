import { IconLayoutGrid } from "@tabler/icons-react";
import type { Simulation } from "d3-force";
import { useAtomValue, useSetAtom } from "jotai";
import { applySimulationPositions } from "../../canvas/layout/applySimulationPositions";
import {
  buildForceSimulation,
  type SimLink,
  type SimNode,
} from "../../canvas/layout/forceSimulation";
import { activePageAtom, canvasApiAtom, nodesAtom, regionsAtom } from "../../canvas/state";
import type { AppNode } from "../../canvas/types";
import { useRegionsEnabled } from "../../canvas/wayfinding/useRegionsEnabled";
import type { CommandPaletteResult } from "./index";

const FALLBACK_W = 400;
const FALLBACK_H = 300;
const ANIMATED_ALPHA_DECAY = 0.07;
const FIT_EVERY_TICKS = 8;
const FIT_DURATION_MS = 200;

const nodeWidth = (n: AppNode) => n.measured?.width ?? n.width ?? FALLBACK_W;
const nodeHeight = (n: AppNode) => n.measured?.height ?? n.height ?? FALLBACK_H;

let currentSim: Simulation<SimNode, SimLink> | null = null;

export const useOrganizeCanvasCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const activePage = useAtomValue(activePageAtom);
  const setNodes = useSetAtom(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const regionsEnabled = useRegionsEnabled();

  return {
    icon: <IconLayoutGrid size={16} />,
    action: "run",
    label: "Organize canvas",
    description: "Arrange nodes by their connections",
    searchAgainst: "layout auto force directed graph fit",
    onSelect: () => {
      // The schema page runs its own continuous simulation that owns node
      // positions; a second simulation would fight it over every tick.
      if (!canvas || activePage?.name === "schema") {
        return;
      }
      const nodes = canvas.getNodes();
      if (nodes.length < 2) {
        canvas.fitView({ duration: 300 });
        return;
      }

      currentSim?.stop();

      const simNodes: SimNode[] = nodes.map(n => {
        const width = nodeWidth(n);
        const height = nodeHeight(n);
        return {
          id: n.id,
          width,
          height,
          x: n.position.x + width / 2,
          y: n.position.y + height / 2,
        };
      });

      const presentIds = new Set(simNodes.map(n => n.id));
      const simLinks: SimLink[] = canvas
        .getEdges()
        .filter(e => presentIds.has(e.source) && presentIds.has(e.target))
        .map(e => ({ source: e.source, target: e.target }));

      // Nodes sharing a region cluster into their own island. A node belongs to
      // at most one region (enforced when regions are created).
      const regionOfNode = new Map<string, string>();
      if (regionsEnabled) {
        for (const region of regions) {
          for (const memberId of region.memberIds) {
            if (presentIds.has(memberId)) {
              regionOfNode.set(memberId, region.id);
            }
          }
        }
      }

      const sim = buildForceSimulation(simNodes, simLinks, {
        alphaDecay: ANIMATED_ALPHA_DECAY,
        regionOfNode,
      });
      const applyPositions = applySimulationPositions(new Map(simNodes.map(n => [n.id, n])));
      currentSim = sim;
      let tickCount = 0;

      sim.on("tick", () => {
        setNodes(applyPositions);
        tickCount++;
        if (tickCount % FIT_EVERY_TICKS === 0) {
          canvas.fitView({ duration: FIT_DURATION_MS });
        }
      });

      sim.on("end", () => {
        if (currentSim === sim) {
          currentSim = null;
        }
        canvas.fitView({ duration: 400 });
      });

      canvas.fitView({ duration: FIT_DURATION_MS });
    },
  };
};
