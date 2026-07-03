import { IconFilePlus } from "@tabler/icons-react";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useNewPageCommand = (): CommandPaletteResult => {
  const { newPage } = usePageActions();

  return {
    icon: <IconFilePlus size={16} />,
    action: "run",
    label: "New page",
    searchAgainst: "create add tab",
    keybinding: useKeybinding("Page::New"),
    onSelect: () => {
      newPage();
    },
  };
};
