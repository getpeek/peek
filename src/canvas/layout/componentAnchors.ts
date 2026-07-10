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
 * Groups nodes into the clusters that each get their own island. Region
 * members cluster by region — one island per region, regardless of edges —
 * while everything else clusters by connected component. With no region map
 * the result is exactly the connected components.
 */
function computeClusters(
  simNodes: SimNode[],
  simLinks: SimLink[],
  regionOfNode?: ReadonlyMap<string, string>,
): SimNode[][] {
  if (!regionOfNode || regionOfNode.size === 0) {
    return connectedComponents(simNodes, simLinks);
  }

  const regionClusters = new Map<string, SimNode[]>();
  const ungrouped: SimNode[] = [];
  for (const node of simNodes) {
    const regionId = regionOfNode.get(node.id);
    if (regionId === undefined) {
      ungrouped.push(node);
      continue;
    }
    const members = regionClusters.get(regionId) ?? [];
    members.push(node);
    regionClusters.set(regionId, members);
  }

  // Ungrouped nodes still island by connectivity, but only edges wholly among
  // them count — a link crossing into a region must not merge the two.
  const ungroupedIds = new Set(ungrouped.map(node => node.id));
  const ungroupedLinks = simLinks.filter(
    link => ungroupedIds.has(endpointId(link.source)) && ungroupedIds.has(endpointId(link.target)),
  );

  return [...regionClusters.values(), ...connectedComponents(ungrouped, ungroupedLinks)];
}

/**
 * Assigns every node an anchor point: one shared anchor per cluster (a region
 * or, for ungrouped nodes, a connected component), shelf-packed largest-first
 * into a roughly square grid centred on the origin. Pulling nodes toward their
 * cluster's anchor is what separates regions and disconnected subgraphs into
 * their own islands.
 */
export function computeAnchors(
  simNodes: SimNode[],
  simLinks: SimLink[],
  regionOfNode?: ReadonlyMap<string, string>,
): Map<string, Anchor> {
  const islands = computeClusters(simNodes, simLinks, regionOfNode)
    .map(cluster => ({ cluster, cell: componentRadius(cluster) * 2 + ISLAND_GAP }))
    .toSorted((a, b) => b.cell - a.cell);

  const targetRowWidth = Math.max(
    islands[0]?.cell ?? 0,
    Math.sqrt(islands.reduce((sum, island) => sum + island.cell ** 2, 0)),
  );

  const placements: { cluster: SimNode[]; x: number; y: number }[] = [];
  let cursorX = 0;
  let rowY = 0;
  let rowHeight = 0;
  let maxX = 0;
  for (const { cluster, cell } of islands) {
    if (cursorX > 0 && cursorX + cell > targetRowWidth) {
      rowY += rowHeight;
      cursorX = 0;
      rowHeight = 0;
    }
    placements.push({ cluster, x: cursorX + cell / 2, y: rowY + cell / 2 });
    cursorX += cell;
    rowHeight = Math.max(rowHeight, cell);
    maxX = Math.max(maxX, cursorX);
  }
  const maxY = rowY + rowHeight;

  const anchors = new Map<string, Anchor>();
  for (const { cluster, x, y } of placements) {
    const anchor = { x: x - maxX / 2, y: y - maxY / 2 };
    for (const node of cluster) {
      anchors.set(node.id, anchor);
    }
  }
  return anchors;
}
