import type { SimNode } from "./forceSimulation";

export const COLLIDE_PADDING = 48;

// Like d3's forceCollide, corrections are scaled by a fixed strength rather
// than by alpha — an alpha-scaled shove fades as the simulation cools and
// leaves residual overlaps frozen into the final layout.
const COLLIDE_STRENGTH = 0.7;

// A node is pinned (being dragged) exactly when fx/fy hold a number;
// both null and undefined mean the simulation is free to move it.
const unpinned = (pin: number | null | undefined) => typeof pin !== "number";

/**
 * Rectangular collision force. The built-in `forceCollide` treats nodes as
 * circles, which leaves large gaps around wide rectangular nodes.
 */
export function rectCollide<T extends SimNode>(padding: number, iterations: number = 1) {
  let nodes: T[] = [];

  const resolvePair = (a: T, b: T) => {
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
      const shift = (overlapX / 2) * COLLIDE_STRENGTH * (dx < 0 ? -1 : 1);
      if (unpinned(a.fx)) {
        a.x = ax - shift;
      }
      if (unpinned(b.fx)) {
        b.x = bx + shift;
      }
    } else {
      const shift = (overlapY / 2) * COLLIDE_STRENGTH * (dy < 0 ? -1 : 1);
      if (unpinned(a.fy)) {
        a.y = ay - shift;
      }
      if (unpinned(b.fy)) {
        b.y = by + shift;
      }
    }
  };

  const force = () => {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          resolvePair(nodes[i], nodes[j]);
        }
      }
    }
  };

  force.initialize = (ns: T[]) => {
    nodes = ns;
  };

  return force;
}
