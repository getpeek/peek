import { IconLayoutGrid } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { cameraLockedAtom, canvasApiAtom, nodesAtom } from "../../canvas/state";
import type { CommandPaletteResult } from ".";

export const useFitNodesToViewCommand = (): CommandPaletteResult | null => {
  const canvas = useAtomValue(canvasApiAtom);
  const nodes = useAtomValue(nodesAtom);

  if (!nodes.some(n => n.selected)) {
    return null;
  }

  return {
    icon: <IconLayoutGrid size={16} />,
    action: "run",
    label: "Fit nodes to view",
    searchAgainst: "fit nodes view zoom bsp tile layout fill viewport",
    onSelect: () => canvas?.fitSelectedToViewport(),
  };
};

export const useFitNodesToViewAndLockCommand = (): CommandPaletteResult | null => {
  const canvas = useAtomValue(canvasApiAtom);
  const nodes = useAtomValue(nodesAtom);
  const setCameraLocked = useSetAtom(cameraLockedAtom);

  if (!nodes.some(n => n.selected)) {
    return null;
  }

  return {
    icon: <IconLayoutGrid size={16} />,
    action: "run",
    label: "Fit nodes to view and lock camera",
    searchAgainst: "fit nodes view zoom bsp tile lock camera freeze present",
    onSelect: () => {
      canvas?.fitSelectedToViewport();
      setCameraLocked(true);
    },
  };
};
