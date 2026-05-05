import { IconLogin2 } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { collaboratePopoverOpenAtom, sessionStateAtom } from "../../multiplayer/state";
import type { CommandPaletteResult } from ".";

export const useJoinSessionCommand = (): CommandPaletteResult | null => {
  const session = useAtomValue(sessionStateAtom);
  const setOpen = useSetAtom(collaboratePopoverOpenAtom);

  if (session) {
    return null;
  }

  return {
    icon: <IconLogin2 size={16} />,
    label: "Join session",
    searchAgainst: "multiplayer ticket connect collaborate",
    onSelect: () => {
      setOpen(true);
    },
  };
};
