import { IconFilePlus } from "@tabler/icons-react";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import type { CommandPaletteResult } from ".";

export const useNewPageCommand = (): CommandPaletteResult => {
  const { newPage } = usePageActions();

  return {
    icon: <IconFilePlus size={16} />,
    label: "New page",
    searchAgainst: "create add tab",
    onSelect: () => {
      newPage();
    },
  };
};
