import { IconFilePlus } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { usePageActions } from "../../canvas/usePageActions";
import type { CommandPaletteResult } from ".";

export const useNewPageCommand = (): CommandPaletteResult => {
  const { newPage } = usePageActions();

  return {
    icon: <IconFilePlus size={16} />,
    label: <Text size="xs">New Page</Text>,
    searchAgainst: "new page create add tab",
    onSelect: () => {
      newPage();
    },
  };
};
