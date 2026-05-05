import { IconArrowRight, IconArrowLeft } from "@tabler/icons-react";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import type { CommandPaletteResult } from ".";

export const useNextPageCommand = (): CommandPaletteResult | null => {
  const { pages, nextPage } = usePageActions();
  if (pages.length <= 1) {
    return null;
  }
  return {
    icon: <IconArrowRight size={16} />,
    label: "Next page",
    searchAgainst: "forward tab",
    onSelect: () => {
      nextPage();
    },
  };
};

export const usePreviousPageCommand = (): CommandPaletteResult | null => {
  const { pages, previousPage } = usePageActions();
  if (pages.length <= 1) {
    return null;
  }
  return {
    icon: <IconArrowLeft size={16} />,
    label: "Previous page",
    searchAgainst: "back tab",
    onSelect: () => {
      previousPage();
    },
  };
};
