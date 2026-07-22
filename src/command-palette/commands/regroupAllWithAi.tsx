import { IconSparkles } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { configAtom } from "../../state";
import { useRegroupAllWithAi } from "../../canvas/wayfinding/useRegroupAllWithAi";
import type { CommandPaletteResult } from ".";

export const useRegroupAllWithAiCommand = (): CommandPaletteResult | null => {
  const config = useAtomValue(configAtom);
  const regroupAll = useRegroupAllWithAi();

  // AI grouping runs through the ollama endpoint; hide it when that's not set up.
  if (!config?.ai.ollama || !regroupAll) {
    return null;
  }

  return {
    icon: <IconSparkles size={16} />,
    action: "run",
    label: "Regroup all nodes with AI",
    description: "Re-partition every node on the page into fresh AI-named regions",
    searchAgainst: "regroup reorganize ai regions cluster reshape wayfinding all",
    onSelect: () => void regroupAll(),
  };
};
