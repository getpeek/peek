import { IconFile } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import type { CommandPaletteResult } from ".";

export const useGoToPageCommands = (): CommandPaletteResult[] => {
  const { pages, activePageId, switchPage } = usePageActions();

  return pages
    .filter(page => page.id !== activePageId)
    .map(page => ({
      icon: <IconFile size={16} />,
      label: <Text size='xs'>Go to {page.name}</Text>,
      searchAgainst: `go to page ${page.name}`,
      onSelect: () => {
        switchPage(page.id);
      },
    }));
};
