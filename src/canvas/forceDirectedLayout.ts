import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

export const LINK_DISTANCE = 950;
export const LINK_STRENGTH = 0.18;
export const CHARGE_STRENGTH = -9000;
export const CENTERING_STRENGTH = 0.02;
export const ALPHA_DECAY = 0.02;
export const PADDING = 140;

export interface SimNode extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
}

export type SimLink = SimulationLinkDatum<SimNode>;

export interface ForceLayoutOptions {
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  centeringStrength?: number;
  alphaDecay?: number;
  padding?: number;
  collisionIterations?: number;
}

/**
 * Custom rectangular collision force for d3-force. The built-in
 * `forceCollide` treats nodes as circles which leaves a lot of unused
 * space when nodes are wide rectangles.
 *
 * Mirrors the `collision.js` helper that ships with the React Flow
 * Force Layout pro example.
 */
export function rectCollide<T extends SimNode>(padding: number, iterations: number = 1) {
  let nodes: T[] = [];

  const resolvePair = (a: T, b: T, alpha: number) => {
    const ax = a.x ?? 0;
    const ay = a.y ?? 0;
    const bx = b.x ?? 0;
    const by = b.y ?? 0;
    const dx = bx - ax;
    const dy = by - ay;
    const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
    const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) {
      return;
    }
    if (overlapX < overlapY) {
      const shift = (overlapX / 2) * alpha * (dx < 0 ? -1 : 1);
      if (a.fx === null) {
        a.x = ax - shift;
      }
      if (b.fx === null) {
        b.x = bx + shift;
      }
    } else {
      const shift = (overlapY / 2) * alpha * (dy < 0 ? -1 : 1);
      if (a.fy === null) {
        a.y = ay - shift;
      }
      if (b.fy === null) {
        b.y = by + shift;
      }
    }
  };

  const force = (alpha: number) => {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          resolvePair(nodes[i], nodes[j], alpha);
        }
      }
    }
  };

  force.initialize = (ns: T[]) => {
    nodes = ns;
  };

  return force;
}

/**
 * Build a d3-force simulation with the rectangle-aware force chain we
 * use across the canvas. Coordinates on `simNodes` should already be at
 * the node *centre*. Caller decides whether to drive the simulation
 * with `tick(n)` (one-shot) or `on("tick", …)` (continuous).
 */
export function buildForceSimulation(
  simNodes: SimNode[],
  simLinks: SimLink[],
  options: ForceLayoutOptions = {},
): Simulation<SimNode, SimLink> {
  const linkDistance = options.linkDistance ?? LINK_DISTANCE;
  const linkStrength = options.linkStrength ?? LINK_STRENGTH;
  const chargeStrength = options.chargeStrength ?? CHARGE_STRENGTH;
  const centeringStrength = options.centeringStrength ?? CENTERING_STRENGTH;
  const alphaDecay = options.alphaDecay ?? ALPHA_DECAY;
  const padding = options.padding ?? PADDING;
  const collisionIterations = options.collisionIterations ?? 1;

  return forceSimulation<SimNode, SimLink>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(linkStrength),
    )
    .force("charge", forceManyBody<SimNode>().strength(chargeStrength))
    .force("x", forceX<SimNode>(0).strength(centeringStrength))
    .force("y", forceY<SimNode>(0).strength(centeringStrength))
    .force("center", forceCenter(0, 0))
    .force("collide", rectCollide<SimNode>(padding, collisionIterations))
    .alphaDecay(alphaDecay);
}
