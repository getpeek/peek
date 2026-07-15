import { IconSparkles } from "@tabler/icons-react";
import { useRegroupAllWithAi } from "../../canvas/wayfinding/useRegroupAllWithAi";
import type { CommandPaletteResult } from ".";

export const useRegroupAllWithAiCommand = (): CommandPaletteResult | null => {
  const regroupAll = useRegroupAllWithAi();

  if (!regroupAll) {
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
