import { Position, type InternalNode, type Node } from "@xyflow/react";

type Rect = { x: number; y: number; width: number; height: number };

function getNodeRect(node: InternalNode<Node>): Rect {
  const { positionAbsolute } = node.internals;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  return {
    x: positionAbsolute.x,
    y: positionAbsolute.y,
    width,
    height,
  };
}

function getCenter(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

// Compute the intersection point between the line connecting the two node
// centers and the bounding box of `intersectionNode`.
function getNodeIntersection(
  intersectionNode: InternalNode<Node>,
  targetNode: InternalNode<Node>,
) {
  const a = getNodeRect(intersectionNode);
  const b = getNodeRect(targetNode);

  if (a.width === 0 || a.height === 0) {
    return getCenter(a);
  }

  const w = a.width / 2;
  const h = a.height / 2;

  const cA = getCenter(a);
  const cB = getCenter(b);

  // Liang-Barsky / standard rectangle-line intersection trick used in the
  // official @xyflow floating-edges example.
  const x1 = (cB.x - cA.x) / (2 * w) - (cB.y - cA.y) / (2 * h);
  const x2 = (cB.x - cA.x) / (2 * w) + (cB.y - cA.y) / (2 * h);
  const a1 = 1 / (Math.abs(x1) + Math.abs(x2) || 1);
  const xx3 = a1 * x1;
  const yy3 = a1 * x2;
  const x = w * (xx3 + yy3) + cA.x;
  const y = h * (-xx3 + yy3) + cA.y;

  return { x, y };
}

// Map an intersection point to the side of the node it lies on so that
// React Flow can use it as a Position when rendering the edge path.
function getEdgePosition(
  node: InternalNode<Node>,
  point: { x: number; y: number },
): Position {
  const rect = getNodeRect(node);
  const px = Math.round(point.x);
  const py = Math.round(point.y);
  const nx = Math.round(rect.x);
  const ny = Math.round(rect.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + rect.width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + rect.height - 1) return Position.Bottom;

  return Position.Top;
}

export function getEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>,
) {
  const sourceIntersection = getNodeIntersection(source, target);
  const targetIntersection = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersection);
  const targetPos = getEdgePosition(target, targetIntersection);

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos,
    targetPos,
  };
}
