import type { AppEdge, AppNode } from "./types";

// Ephemeral interaction fields (selection, drag, resize) must never reach a
// persisted or diffed representation — undo, multiplayer sync, and version
// history all compare stripped shapes.
export function stripNode(n: AppNode): AppNode {
  const {
    selected: _s,
    dragging: _d,
    resizing: _r,
    ...rest
  } = n as AppNode & {
    selected?: boolean;
    dragging?: boolean;
    resizing?: boolean;
  };
  return rest as AppNode;
}

export function stripEdge(e: AppEdge): AppEdge {
  const { selected: _s, ...rest } = e as AppEdge & { selected?: boolean };
  return rest as AppEdge;
}
