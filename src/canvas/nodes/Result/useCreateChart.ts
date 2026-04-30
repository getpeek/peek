import { useAtomValue } from "jotai";
import { useCanvas } from "../../hooks/useCanvas";
import { createChart } from "../../createChart";
import { resultsAtom } from "../../state";
import type { ResultNode } from "../../types";

export const useCreateChart = () => {
  const canvas = useCanvas();
  const results = useAtomValue(resultsAtom);
  return (resultNode: ResultNode) => createChart(canvas, resultNode, results[resultNode.id] ?? []);
};
