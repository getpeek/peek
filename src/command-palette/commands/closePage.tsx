import { IconFileMinus } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { documentAtom } from "../../canvas/state";
import { usePageActions } from "../../canvas/usePageActions";
import type { CommandPaletteResult } from ".";

export const useClosePageCommand = (): CommandPaletteResult | null => {
  const { canClose, closeActivePage, activePageId } = usePageActions();
  const doc = useAtomValue(documentAtom);

  if (!canClose) return null;

  const activeName = doc.pages[activePageId]?.name ?? "Page";

  return {
    icon: <IconFileMinus size={16} />,
    label: <Text size="xs">Close Page</Text>,
    searchAgainst: "close delete remove page tab",
    description: (
      <Text size="xs" c="var(--text-color-subtle)">
        {activeName}
      </Text>
    ),
    onSelect: () => {
      closeActivePage();
    },
  };
};
