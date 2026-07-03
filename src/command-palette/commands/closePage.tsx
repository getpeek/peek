import { IconFileMinus } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { documentAtom } from "../../canvas/state";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useClosePageCommand = (): CommandPaletteResult | null => {
  const { canClose, closeActivePage, activePageId } = usePageActions();
  const doc = useAtomValue(documentAtom);
  const keybinding = useKeybinding("Page::Close");

  if (!canClose) {
    return null;
  }

  const activeName = doc.pages[activePageId]?.name ?? "Page";

  return {
    icon: <IconFileMinus size={16} />,
    action: "run",
    label: "Close page",
    description: activeName,
    searchAgainst: "delete remove tab",
    keybinding,
    onSelect: () => {
      closeActivePage();
    },
  };
};
