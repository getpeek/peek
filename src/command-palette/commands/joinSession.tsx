import { IconLogin2 } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { useAtomValue, useSetAtom } from "jotai";
import {
  joinDialogOpenAtom,
  sessionStateAtom,
} from "../../multiplayer/state";
import type { CommandPaletteResult } from ".";

export const useJoinSessionCommand = (): CommandPaletteResult | null => {
  const session = useAtomValue(sessionStateAtom);
  const setOpen = useSetAtom(joinDialogOpenAtom);

  if (session) return null;

  return {
    icon: <IconLogin2 size={16} />,
    label: <Text size="xs">Join session</Text>,
    searchAgainst: "join session multiplayer ticket connect",
    onSelect: () => {
      setOpen(true);
    },
  };
};
