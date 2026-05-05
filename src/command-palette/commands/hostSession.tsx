import { IconBroadcast, IconBroadcastOff } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { collaboratePopoverOpenAtom, sessionStateAtom } from "../../multiplayer/state";
import type { MultiplayerControls } from "../../multiplayer/syncBridge";
import type { CommandPaletteResult } from ".";

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

export const useHostSessionCommand = (): CommandPaletteResult => {
  const session = useAtomValue(sessionStateAtom);
  const setOpen = useSetAtom(collaboratePopoverOpenAtom);
  const isInSession = session !== null && session !== undefined;
  const isHost = session?.role === "host";

  return {
    icon: isHost ? <IconBroadcastOff size={16} /> : <IconBroadcast size={16} />,
    label: isHost ? "End hosted session" : isInSession ? "Leave session" : "Host session",
    searchAgainst: "multiplayer share collaborate",
    onSelect: async () => {
      if (isInSession) {
        await controls()?.end();
      } else {
        setOpen(true);
      }
    },
  };
};
