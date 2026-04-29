import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps } from "@xyflow/react";
import { getEdgeParams } from "./floatingEdgeUtils";

// Custom edge that always connects to the closest sides of the source/target
// nodes, regardless of which fixed handles each node exposes. Endpoints are
// recomputed every render based on the live node positions, so the edge stays
// well-routed as nodes are dragged around.
export function FloatingEdge(props: EdgeProps) {
  const { id, source, target, markerEnd, markerStart, style } = props;
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const [path] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <BaseEdge id={id} path={path} markerEnd={markerEnd} markerStart={markerStart} style={style} />
  );
}
