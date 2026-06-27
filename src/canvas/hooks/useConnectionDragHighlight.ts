import { useReactFlow, type OnConnectStart } from "@xyflow/react";
import { useCallback, useState } from "react";
import type { AppEdge, AppNode } from "../types";

// Source node type → the class that lights up its eligible targets while a
// connection is dragged from it. The matching selectors live in node.css.
const SOURCE_HINT_CLASS: Record<string, string> = {
  variable: "connecting-from-variable",
  result: "connecting-from-result",
};

export function useConnectionDragHighlight() {
  const rf = useReactFlow<AppNode, AppEdge>();
  const [sourceHint, setSourceHint] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const onConnectStart = useCallback<OnConnectStart>(
    (_e, params) => {
      setConnecting(true);
      const type = params.nodeId ? rf.getNode(params.nodeId)?.type : undefined;
      setSourceHint(type ? (SOURCE_HINT_CLASS[type] ?? null) : null);
    },
    [rf],
  );

  const onConnectEnd = useCallback(() => {
    setSourceHint(null);
    setConnecting(false);
  }, []);

  return { sourceHint, connecting, onConnectStart, onConnectEnd };
}
