import { useStore } from "@xyflow/react";

// Zoom cross-fade: t is 0 at zoom >= BEACON_FADE_START (normal work), 1 once
// zoom drops another BEACON_FADE_RANGE below it (overview). Beacons and the
// confirmed-region halos fade in with t; node dimming kicks in past
// DIM_THRESHOLD_T.
export const BEACON_FADE_START = 0.35;
export const BEACON_FADE_RANGE = 0.14;
export const DIM_THRESHOLD_T = 0.4;
export const HINT_THRESHOLD_T = 0.15;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const crossFade = (zoom: number) => clamp01((BEACON_FADE_START - zoom) / BEACON_FADE_RANGE);

/** Live cross-fade factor, re-rendering the caller each frame of a pan/zoom. */
export function useCrossFade(): number {
  return crossFade(useStore(s => s.transform[2]));
}
