import { useCanvas } from "./useCanvas";
import { createChart } from "./createChart";
import type { ResultNode } from "./types";

export const useCreateChart = () => {
  const canvas = useCanvas();
  return (resultNode: ResultNode) => createChart(canvas, resultNode);
};
