import type { SimLink, SimNode } from "./forceSimulation";

const AREA_FACTOR = 2.5;
const ISLAND_GAP = 250;

export interface Anchor {
  x: number;
  y: number;
}

export function endpointId(endpoint: string | number | SimNode): string {
  return typeof endpoint === "object" ? endpoint.id : String(endpoint);
}

function connectedComponents(simNodes: SimNode[], simLinks: SimLink[]): SimNode[][] {
  const nodeById = new Map(simNodes.map(node => [node.id, node]));
  const adjacency = new Map<string, string[]>(simNodes.map(node => [node.id, []]));
  for (const link of simLinks) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    adjacency.get(source)?.push(target);
    adjacency.get(target)?.push(source);
  }

  const visited = new Set<string>();
  const components: SimNode[][] = [];
  for (const root of simNodes) {
    if (visited.has(root.id)) {
      continue;
    }
    visited.add(root.id);
    const queue = [root.id];
    const component: SimNode[] = [];
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head];
      const node = nodeById.get(id);
      if (node) {
        component.push(node);
      }
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function componentRadius(component: SimNode[]): number {
  if (component.length === 1) {
    return Math.max(component[0].width, component[0].height) / 2;
  }
  const area = component.reduce((sum, node) => sum + node.width * node.height, 0);
  return Math.sqrt((area * AREA_FACTOR) / Math.PI);
}

/**
 * Assigns every node an anchor point: one shared anchor per connected
 * component, shelf-packed largest-first into a roughly square grid centred
 * on the origin. Pulling nodes toward their component's anchor is what
 * separates disconnected subgraphs into their own islands.
 */
export function computeAnchors(simNodes: SimNode[], simLinks: SimLink[]): Map<string, Anchor> {
  const islands = connectedComponents(simNodes, simLinks)
    .map(component => ({ component, cell: componentRadius(component) * 2 + ISLAND_GAP }))
    .toSorted((a, b) => b.cell - a.cell);

  const targetRowWidth = Math.max(
    islands[0]?.cell ?? 0,
    Math.sqrt(islands.reduce((sum, island) => sum + island.cell ** 2, 0)),
  );

  const placements: { component: SimNode[]; x: number; y: number }[] = [];
  let cursorX = 0;
  let rowY = 0;
  let rowHeight = 0;
  let maxX = 0;
  for (const { component, cell } of islands) {
    if (cursorX > 0 && cursorX + cell > targetRowWidth) {
      rowY += rowHeight;
      cursorX = 0;
      rowHeight = 0;
    }
    placements.push({ component, x: cursorX + cell / 2, y: rowY + cell / 2 });
    cursorX += cell;
    rowHeight = Math.max(rowHeight, cell);
    maxX = Math.max(maxX, cursorX);
  }
  const maxY = rowY + rowHeight;

  const anchors = new Map<string, Anchor>();
  for (const { component, x, y } of placements) {
    const anchor = { x: x - maxX / 2, y: y - maxY / 2 };
    for (const node of component) {
      anchors.set(node.id, anchor);
    }
  }
  return anchors;
}
