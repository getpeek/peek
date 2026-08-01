import type { AppNode } from "./types";

// Unmeasured nodes (first frames after mount) still get a plausible extent so
// boxes drawn around them don't collapse while React Flow measures.
const FALLBACK_SIZE = 200;

export const nodeWidth = (n: AppNode) => n.measured?.width ?? n.width ?? FALLBACK_SIZE;
export const nodeHeight = (n: AppNode) => n.measured?.height ?? n.height ?? FALLBACK_SIZE;
