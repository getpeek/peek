import { IconSparkles } from "@tabler/icons-react";
import { useGroupWithAi } from "../../canvas/wayfinding/useGroupWithAi";
import type { CommandPaletteResult } from ".";

export const useGroupWithAiCommand = (): CommandPaletteResult | null => {
  const groupWithAi = useGroupWithAi();

  if (!groupWithAi) {
    return null;
  }

  return {
    icon: <IconSparkles size={16} />,
    action: "run",
    label: "Group ungrouped nodes with AI",
    description: "Cluster ungrouped nodes spatially and let AI name each region",
    searchAgainst: "group ai regions cluster organize wayfinding suggest",
    onSelect: () => void groupWithAi(),
  };
};
