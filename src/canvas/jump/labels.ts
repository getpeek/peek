import type { AppNode } from "../types";

// Home-row-first alphabet, so the nearest nodes get the easiest keys to reach.
const ALPHABET = "asdfghjklqwertyuiopzxcvbnm";

export interface JumpTarget {
  id: string;
  label: string;
  // Screen-space top-left of the node, where its badge is anchored.
  screenX: number;
  screenY: number;
}

const nodeSize = (node: AppNode): { width: number; height: number } => ({
  width: node.measured?.width ?? node.width ?? 0,
  height: node.measured?.height ?? node.height ?? 0,
});

// Uniform-length labels so none is a prefix of another: single letters until
// the alphabet runs out, then two-letter combos.
export const labelsForCount = (count: number): string[] => {
  if (count <= ALPHABET.length) {
    return Array.from(ALPHABET.slice(0, count));
  }
  const labels: string[] = [];
  for (const first of ALPHABET) {
    for (const second of ALPHABET) {
      labels.push(first + second);
      if (labels.length === count) {
        return labels;
      }
    }
  }
  return labels;
};

/**
 * Label every node whose box intersects the viewport, ordered so the node
 * nearest the viewport centre gets the first (easiest) label. Everything is
 * derived from node state + the live transform — never the DOM — so culled
 * nodes (onlyRenderVisibleElements) are still handled correctly.
 */
export const jumpTargets = (
  nodes: AppNode[],
  transform: [number, number, number],
  viewport: { width: number; height: number },
): JumpTarget[] => {
  const [tx, ty, tz] = transform;
  const left = -tx / tz;
  const top = -ty / tz;
  const right = (viewport.width - tx) / tz;
  const bottom = (viewport.height - ty) / tz;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  const visible = nodes
    .filter(node => !node.hidden)
    .flatMap(node => {
      const { width, height } = nodeSize(node);
      const { x, y } = node.position;
      const onScreen = x < right && x + width > left && y < bottom && y + height > top;
      if (!onScreen) {
        return [];
      }
      const dx = x + width / 2 - centerX;
      const dy = y + height / 2 - centerY;
      return [{ node, distance: dx * dx + dy * dy }];
    })
    .toSorted((a, b) => a.distance - b.distance);

  const labels = labelsForCount(visible.length);
  return visible.map(({ node }, index) => ({
    id: node.id,
    label: labels[index],
    screenX: node.position.x * tz + tx,
    screenY: node.position.y * tz + ty,
  }));
};
