// Zoom cross-fade: t is 0 at zoom >= BEACON_FADE_START (normal work), 1 once
// zoom drops another BEACON_FADE_RANGE below it (overview). Beacons/peekers fade
// in with t; node dimming kicks in past DIM_THRESHOLD_T. The region halos mirror
// this same curve in CSS via --pk-zoom (wayfinding.css) so their filtered SVG can
// stay static during zoom instead of re-rendering — and re-rasterizing — per frame.
export const BEACON_FADE_START = 0.35;
export const BEACON_FADE_RANGE = 0.14;
export const DIM_THRESHOLD_T = 0.4;
export const HINT_THRESHOLD_T = 0.15;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const crossFade = (zoom: number) => clamp01((BEACON_FADE_START - zoom) / BEACON_FADE_RANGE);
