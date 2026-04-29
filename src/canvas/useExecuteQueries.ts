import { useAtomValue, useSetAtom } from "jotai";
import { useCanvas } from "./useCanvas";
import { executeQueries } from "./executeQueries";
import { resultsAtom } from "./state";
import { sessionStateAtom } from "../multiplayer/state";
import { requestRemoteExecution } from "../multiplayer/syncBridge";
import type { AppNode, QueryData } from "./types";

export const useExecuteQueries = () => {
  const canvas = useCanvas();
  const setResults = useSetAtom(resultsAtom);
  const session = useAtomValue(sessionStateAtom);
  return (sourceNode: AppNode, queries: string[]) => {
    // Joiners don't have a DB connection of their own — forward the request
    // to the host, which will run against its DB and stream results back.
    if (session?.role === "joiner") {
      // Optimistically reflect in-flight state locally; the host will
      // overwrite both true→true and the eventual false via doc sync.
      if (sourceNode.type === "query") {
        canvas.updateNodeData<QueryData>(sourceNode.id, { isRunning: true });
      }
      return requestRemoteExecution(sourceNode.id, queries);
    }
    return executeQueries({ canvas, setResults, sourceNode, queries });
  };
};
