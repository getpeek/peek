import { useStore } from "@xyflow/react";

// Below this zoom a node is small enough on screen that mounting its full
// interactive body (e.g. a Monaco editor) isn't worth the DOM/paint cost —
// the node can render a cheap preview instead.
const NEAR_THRESHOLD = 0.4;

export type ZoomTier = "near" | "far";

/**
 * Current zoom bucketed into a discrete tier. Returning a tier rather than the
 * raw zoom means subscribers re-render only when crossing the threshold, not
 * on every pan/zoom frame.
 */
export function useZoomTier(): ZoomTier {
  return useStore(s => (s.transform[2] >= NEAR_THRESHOLD ? "near" : "far"));
}
