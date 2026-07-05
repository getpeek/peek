import type { AppNode } from "../types";
import type { SimNode } from "./forceSimulation";

/**
 * Updater for `nodesAtom` that copies simulation centre coordinates back to
 * React Flow top-left positions. Returns the input array reference when
 * nothing moved so unchanged ticks don't cause re-renders.
 */
export function applySimulationPositions(
  simNodeById: Map<string, SimNode>,
  skip?: (node: AppNode) => boolean,
) {
  return (nodes: AppNode[]): AppNode[] => {
    let mutated = false;
    const next = nodes.map(node => {
      if (skip?.(node)) {
        return node;
      }
      const simNode = simNodeById.get(node.id);
      if (!simNode) {
        return node;
      }
      const x = (simNode.x ?? 0) - simNode.width / 2;
      const y = (simNode.y ?? 0) - simNode.height / 2;
      if (x === node.position.x && y === node.position.y) {
        return node;
      }
      mutated = true;
      return { ...node, position: { x, y } };
    });
    return mutated ? next : nodes;
  };
}
