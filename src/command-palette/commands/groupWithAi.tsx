import { IconSparkles } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { configAtom } from "../../state";
import { useGroupWithAi } from "../../canvas/wayfinding/useGroupWithAi";
import type { CommandPaletteResult } from ".";

export const useGroupWithAiCommand = (): CommandPaletteResult | null => {
  const config = useAtomValue(configAtom);
  const groupWithAi = useGroupWithAi();

  // AI grouping runs through the ollama endpoint; hide it when that's not set up.
  if (!config?.ai.ollama || !groupWithAi) {
    return null;
  }

  return {
    icon: <IconSparkles size={16} />,
    action: "run",
    label: "Group ungrouped nodes with AI",
    description: "Let AI slot ungrouped nodes into existing regions or new ones",
    searchAgainst: "group ai regions cluster organize wayfinding suggest ungrouped",
    onSelect: () => void groupWithAi(),
  };
};
