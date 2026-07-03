import { IconLayoutRows } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { canvasApiAtom, nodesAtom, resultsAtom } from "../../canvas/state";
import type { ResultNode } from "../../canvas/types";
import { togglePivot } from "../../canvas/nodes/Result/togglePivot";
import type { CommandPaletteResult } from ".";

export const usePivotResultCommand = (): CommandPaletteResult | null => {
  const canvas = useAtomValue(canvasApiAtom);
  const nodes = useAtomValue(nodesAtom);
  const results = useAtomValue(resultsAtom);

  const selected = nodes.filter((n): n is ResultNode => n.type === "result" && n.selected === true);

  if (selected.length === 0) {
    return null;
  }

  return {
    icon: <IconLayoutRows size={16} />,
    action: "run",
    label: "Pivot result",
    searchAgainst: "transpose record view unpivot",
    onSelect: () => {
      if (!canvas) {
        return;
      }
      for (const node of selected) {
        togglePivot(canvas, node.id, results[node.id]?.[0]?.length ?? 0);
      }
      // A lone pivoted node is usually parked off-screen; recenter so it isn't
      // lost. With several selected the camera can't follow them all, so skip it.
      if (selected.length === 1) {
        canvas.zoomToNode(selected[0].id, { duration: 200 });
      }
    },
  };
};
