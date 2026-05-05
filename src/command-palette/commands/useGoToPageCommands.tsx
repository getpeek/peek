import { IconFile } from "@tabler/icons-react";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import type { CommandPaletteResult } from ".";

export const useGoToPageCommands = (): CommandPaletteResult[] => {
  const { pages, activePageId, switchPage } = usePageActions();

  return pages
    .filter(page => page.id !== activePageId)
    .map(page => ({
      icon: <IconFile size={16} />,
      label: `Go to ${page.name}`,
      searchAgainst: "page",
      onSelect: () => {
        switchPage(page.id);
      },
    }));
};
