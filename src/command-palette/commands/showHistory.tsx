import { IconHistory } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { historyPanelOpenAtom } from "../../canvas/history/state";
import { sessionStateAtom } from "../../multiplayer/state";
import type { CommandPaletteResult } from ".";

export const useShowHistoryCommand = (): CommandPaletteResult | null => {
  const setHistoryPanelOpen = useSetAtom(historyPanelOpenAtom);
  const session = useAtomValue(sessionStateAtom);

  // A joiner views the host's replica — the local history log doesn't
  // describe the board they're looking at.
  if (session?.role === "joiner") {
    return null;
  }

  return {
    icon: <IconHistory size={16} />,
    action: "open",
    label: "Show history",
    searchAgainst: "history versions timeline checkpoints restore scrub",
    onSelect: () => setHistoryPanelOpen(true),
  };
};
