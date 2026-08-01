import { useReactFlow, useStore } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";
import { followingAuthorAtom } from "../../multiplayer/state";
import { nodeHeight, nodeWidth } from "../nodeGeometry";
import { nodeTypeColorVar } from "../nodeTypeColor";
import { cameraLockedAtom, nodesAtom } from "../state";
import type { AppNode } from "../types";
import "./Minimap.css";

const MM_W = 176;
const MM_H = 116;
const MM_PAD = 10;
/** Screen px below which a node rect would be too small to notice. */
const MM_MIN_NODE = 3;

type Box = { x: number; y: number; w: number; h: number };

/**
 * The world-space rectangle the minimap shows: every node plus the current
 * viewport, so the frame never leaves the panel, widened to the minimap's
 * aspect ratio so the fit is uniform in both axes.
 */
function fitBox(nodes: AppNode[], view: Box): Box {
  let minX = view.x;
  let minY = view.y;
  let maxX = view.x + view.w;
  let maxY = view.y + view.h;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth(node));
    maxY = Math.max(maxY, node.position.y + nodeHeight(node));
  }

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((MM_W - MM_PAD * 2) / spanX, (MM_H - MM_PAD * 2) / spanY);
  const w = MM_W / scale;
  const h = MM_H / scale;

  return { x: minX + spanX / 2 - w / 2, y: minY + spanY / 2 - h / 2, w, h };
}

/** Where a pointer sits in world coordinates, given the box the svg is showing. */
function pointerToWorld(event: React.PointerEvent<SVGSVGElement>, box: Box) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: box.x + ((event.clientX - rect.left) / rect.width) * box.w,
    y: box.y + ((event.clientY - rect.top) / rect.height) * box.h,
  };
}

export function Minimap() {
  const nodes = useAtomValue(nodesAtom);
  const cameraLocked = useAtomValue(cameraLockedAtom);
  const setFollowing = useSetAtom(followingAuthorAtom);
  // The live transform, not `viewportAtom` — that only settles on `onMoveEnd`,
  // which would freeze the frame mid-gesture.
  const [tx, ty, zoom] = useStore(s => s.transform);
  const flowWidth = useStore(s => s.width);
  const flowHeight = useStore(s => s.height);
  const rf = useReactFlow();

  const [dragging, setDragging] = useState(false);
  // Frozen at pointerdown: re-deriving the mapping every frame would shift the
  // world point under a stationary cursor as the fit box grows.
  const grab = useRef<{ box: Box; offsetX: number; offsetY: number } | null>(null);

  if (!flowWidth || !flowHeight) {
    return null;
  }

  const view = { x: -tx / zoom, y: -ty / zoom, w: flowWidth / zoom, h: flowHeight / zoom };
  const box = fitBox(nodes, view);
  const scale = MM_W / box.w;
  const minSize = MM_MIN_NODE / scale;

  const centerOn = (worldX: number, worldY: number) =>
    void rf.setViewport({
      x: flowWidth / 2 - worldX * zoom,
      y: flowHeight / 2 - worldY * zoom,
      zoom,
    });

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (cameraLocked || event.button !== 0) {
      return;
    }
    // Otherwise the canvas underneath starts its own pan or rubber-band select.
    event.preventDefault();
    event.stopPropagation();
    // `onMoveStart` can't do this for us: it only clears the follow for real
    // pointer gestures, and `setViewport` reaches d3 with a null source event.
    setFollowing(null);
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = pointerToWorld(event, box);
    const inside =
      point.x >= view.x &&
      point.x <= view.x + view.w &&
      point.y >= view.y &&
      point.y <= view.y + view.h;

    // Grabbing the frame keeps its offset; clicking elsewhere recentres first.
    grab.current = inside
      ? { box, offsetX: view.x + view.w / 2 - point.x, offsetY: view.y + view.h / 2 - point.y }
      : { box, offsetX: 0, offsetY: 0 };
    setDragging(true);

    if (!inside) {
      centerOn(point.x, point.y);
    }
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const held = grab.current;
    if (!held) {
      return;
    }
    const point = pointerToWorld(event, held.box);
    centerOn(point.x + held.offsetX, point.y + held.offsetY);
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!grab.current) {
      return;
    }
    grab.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <svg
      className={`canvas-minimap${dragging ? " dragging" : ""}${cameraLocked ? " locked" : ""}`}
      width={MM_W}
      height={MM_H}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {nodes.map(node => (
        <rect
          key={node.id}
          className={node.selected ? "mm-node selected" : "mm-node"}
          x={node.position.x}
          y={node.position.y}
          width={Math.max(minSize, nodeWidth(node))}
          height={Math.max(minSize, nodeHeight(node))}
          rx={2 / scale}
          fill={nodeTypeColorVar(node.type) ?? "var(--pk-accent)"}
          vectorEffect='non-scaling-stroke'
        />
      ))}
      <rect
        className='mm-viewport'
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
        rx={2 / scale}
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  );
}
