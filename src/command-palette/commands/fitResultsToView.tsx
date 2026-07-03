import { IconLayoutGrid } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { cameraLockedAtom, canvasApiAtom, nodesAtom } from "../../canvas/state";
import type { CommandPaletteResult } from ".";

export const useFitResultsToViewCommand = (): CommandPaletteResult | null => {
  const canvas = useAtomValue(canvasApiAtom);
  const nodes = useAtomValue(nodesAtom);

  if (!nodes.some(n => n.selected)) {
    return null;
  }

  return {
    icon: <IconLayoutGrid size={16} />,
    action: "run",
    label: "Fit results to view",
    searchAgainst: "fit results view zoom bsp tile layout fill viewport",
    onSelect: () => canvas?.fitSelectedToViewport(),
  };
};

export const useFitResultsToViewAndLockCommand = (): CommandPaletteResult | null => {
  const canvas = useAtomValue(canvasApiAtom);
  const nodes = useAtomValue(nodesAtom);
  const setCameraLocked = useSetAtom(cameraLockedAtom);

  if (!nodes.some(n => n.selected)) {
    return null;
  }

  return {
    icon: <IconLayoutGrid size={16} />,
    action: "run",
    label: "Fit results to view and lock camera",
    searchAgainst: "fit results view zoom bsp tile lock camera freeze present",
    onSelect: () => {
      canvas?.fitSelectedToViewport();
      setCameraLocked(true);
    },
  };
};
