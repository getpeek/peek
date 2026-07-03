import { IconArrowRight, IconArrowLeft } from "@tabler/icons-react";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useNextPageCommand = (): CommandPaletteResult | null => {
  const { pages, nextPage } = usePageActions();
  const keybinding = useKeybinding("Page::Next");
  if (pages.length <= 1) {
    return null;
  }
  return {
    icon: <IconArrowRight size={16} />,
    action: "open",
    label: "Next page",
    searchAgainst: "forward tab",
    keybinding,
    onSelect: () => {
      nextPage();
    },
  };
};

export const usePreviousPageCommand = (): CommandPaletteResult | null => {
  const { pages, previousPage } = usePageActions();
  const keybinding = useKeybinding("Page::Previous");
  if (pages.length <= 1) {
    return null;
  }
  return {
    icon: <IconArrowLeft size={16} />,
    action: "open",
    label: "Previous page",
    searchAgainst: "back tab",
    keybinding,
    onSelect: () => {
      previousPage();
    },
  };
};
