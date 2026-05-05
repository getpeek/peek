import { useReactFlow, type OnConnectStart } from "@xyflow/react";
import { useCallback, useState } from "react";
import type { AppEdge, AppNode } from "../types";

export function useVariableDragHighlight() {
  const rf = useReactFlow<AppNode, AppEdge>();
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const onConnectStart = useCallback<OnConnectStart>(
    (_e, params) => {
      setConnecting(true);
      if (params.nodeId && rf.getNode(params.nodeId)?.type === "variable") {
        setActive(true);
      }
    },
    [rf],
  );

  const onConnectEnd = useCallback(() => {
    setActive(false);
    setConnecting(false);
  }, []);

  return { active, connecting, onConnectStart, onConnectEnd };
}
