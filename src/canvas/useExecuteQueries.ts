import { useCanvas } from "./useCanvas";
import { executeQueries } from "./executeQueries";
import type { AppNode } from "./types";

export const useExecuteQueries = () => {
  const canvas = useCanvas();
  return (sourceNode: AppNode, queries: string[]) =>
    executeQueries(canvas, sourceNode, queries);
};
