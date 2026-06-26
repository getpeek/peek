import { useStore } from "jotai";
import { useCanvas } from "../../../hooks/useCanvas";
import { createChart } from "../../../createChart";
import { resultsAtom } from "../../../state";
import type { ResultNode } from "../../../types";

export const useCreateChart = () => {
  const canvas = useCanvas();
  const store = useStore();
  // Read on demand instead of subscribing — charting is a click action, so the
  // node needn't re-render whenever any result node's rows change.
  return (resultNode: ResultNode) =>
    createChart(canvas, resultNode, store.get(resultsAtom)[resultNode.id] ?? []);
};
