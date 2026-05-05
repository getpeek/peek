import { IconFileMinus } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { documentAtom } from "../../canvas/state";
import { usePageActions } from "../../canvas/hooks/usePageActions";
import type { CommandPaletteResult } from ".";

export const useClosePageCommand = (): CommandPaletteResult | null => {
  const { canClose, closeActivePage, activePageId } = usePageActions();
  const doc = useAtomValue(documentAtom);

  if (!canClose) {
    return null;
  }

  const activeName = doc.pages[activePageId]?.name ?? "Page";

  return {
    icon: <IconFileMinus size={16} />,
    label: "Close page",
    description: activeName,
    searchAgainst: "delete remove tab",
    onSelect: () => {
      closeActivePage();
    },
  };
};
