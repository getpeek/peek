import { IconArrowRight, IconArrowLeft } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { usePageActions } from "../../canvas/usePageActions";
import type { CommandPaletteResult } from ".";

export const useNextPageCommand = (): CommandPaletteResult | null => {
  const { pages, nextPage } = usePageActions();
  if (pages.length <= 1) return null;
  return {
    icon: <IconArrowRight size={16} />,
    label: <Text size="xs">Next Page</Text>,
    searchAgainst: "next page forward tab",
    onSelect: () => {
      nextPage();
    },
  };
};

export const usePreviousPageCommand = (): CommandPaletteResult | null => {
  const { pages, previousPage } = usePageActions();
  if (pages.length <= 1) return null;
  return {
    icon: <IconArrowLeft size={16} />,
    label: <Text size="xs">Previous Page</Text>,
    searchAgainst: "previous page back tab",
    onSelect: () => {
      previousPage();
    },
  };
};
