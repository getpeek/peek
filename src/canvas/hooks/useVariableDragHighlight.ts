import { useReactFlow, type OnConnectStart } from "@xyflow/react";
import { useCallback, useState } from "react";
import type { AppEdge, AppNode } from "../types";

export function useVariableDragHighlight() {
  const rf = useReactFlow<AppNode, AppEdge>();
  const [active, setActive] = useState(false);

  const onConnectStart = useCallback<OnConnectStart>(
    (_e, params) => {
      if (!params.nodeId) {
        return;
      }
      if (rf.getNode(params.nodeId)?.type === "variable") {
        setActive(true);
      }
    },
    [rf],
  );

  const onConnectEnd = useCallback(() => {
    setActive(false);
  }, []);

  return { active, onConnectStart, onConnectEnd };
}
