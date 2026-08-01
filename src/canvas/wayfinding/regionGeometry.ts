import { nodeHeight, nodeWidth } from "../nodeGeometry";
import type { AppNode, RegionState } from "../types";

export const REGION_PADDING = 56;
export const REGION_COLOR_COUNT = 5;

export type RegionBox = { x: number; y: number; w: number; h: number };

export type DerivedRegion = {
  region: RegionState;
  bbox: RegionBox;
  /** Members that still exist on the page — memberIds may hold deleted node ids. */
  memberIds: string[];
};

/**
 * Resolve each region against the live nodes: filter dangling members and
 * compute the padded bounding box. Regions with no remaining members are
 * skipped — they have no place on the canvas.
 */
export function deriveRegions(nodes: AppNode[], regions: RegionState[]): DerivedRegion[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const derived: DerivedRegion[] = [];

  for (const region of regions) {
    const members = region.memberIds.flatMap(id => byId.get(id) ?? []);
    if (members.length === 0) {
      continue;
    }

    const minX = Math.min(...members.map(m => m.position.x)) - REGION_PADDING;
    const minY = Math.min(...members.map(m => m.position.y)) - REGION_PADDING;
    const maxX = Math.max(...members.map(m => m.position.x + nodeWidth(m))) + REGION_PADDING;
    const maxY = Math.max(...members.map(m => m.position.y + nodeHeight(m))) + REGION_PADDING;

    derived.push({
      region,
      bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      memberIds: members.map(m => m.id),
    });
  }

  return derived;
}

export function regionColorVar(colorIndex: number): string {
  return `var(--pk-region-${(colorIndex % REGION_COLOR_COUNT) + 1})`;
}

export type PeekerPlacement = {
  x: number;
  y: number;
  /** Degrees; rotates the arrow toward the region's true off-screen center. */
  angle: number;
  align: "left" | "right";
};

export const PEEKER_WIDTH = 212;
const PEEKER_HEIGHT = 50;
const PEEKER_INSET_X = 16;
// Keep clear of the page tabs up top and the toolbar down below.
const PEEKER_INSET_TOP = 64;
const PEEKER_INSET_BOTTOM = 62;
// A region only counts as off-screen once its box is fully outside this slack,
// so peekers don't flicker in while a region is half visible at an edge.
const OFFSCREEN_SLACK = 40;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Project a region box to screen space and, when it sits fully off-screen,
 * pin a label toward it clamped inside the viewport insets. Returns null for
 * (partially) visible regions.
 */
export function placePeeker(
  bbox: RegionBox,
  transform: [number, number, number],
  viewport: { width: number; height: number },
): PeekerPlacement | null {
  const [tx, ty, tz] = transform;
  const x1 = bbox.x * tz + tx;
  const y1 = bbox.y * tz + ty;
  const x2 = (bbox.x + bbox.w) * tz + tx;
  const y2 = (bbox.y + bbox.h) * tz + ty;

  const onScreen =
    x2 > OFFSCREEN_SLACK &&
    x1 < viewport.width - OFFSCREEN_SLACK &&
    y2 > OFFSCREEN_SLACK &&
    y1 < viewport.height - OFFSCREEN_SLACK;
  if (onScreen) {
    return null;
  }

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const x = clamp(
    cx - PEEKER_WIDTH / 2,
    PEEKER_INSET_X,
    viewport.width - PEEKER_WIDTH - PEEKER_INSET_X,
  );
  const y = clamp(
    cy - PEEKER_HEIGHT / 2,
    PEEKER_INSET_TOP,
    viewport.height - PEEKER_HEIGHT - PEEKER_INSET_BOTTOM,
  );
  const angle =
    (Math.atan2(cy - (y + PEEKER_HEIGHT / 2), cx - (x + PEEKER_WIDTH / 2)) * 180) / Math.PI;
  const align = cx > viewport.width - PEEKER_WIDTH ? ("right" as const) : ("left" as const);

  return { x, y, angle, align };
}
