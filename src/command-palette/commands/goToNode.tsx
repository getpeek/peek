import { IconLocation } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { jumpModeAtom } from "../../canvas/jump/state";
import { CommandPaletteResult } from ".";
import { useKeybinding } from "./useKeybinding";

export const useGoToNodeCommand = (): CommandPaletteResult => {
  const setJumpMode = useSetAtom(jumpModeAtom);
  const keybinding = useKeybinding("Page::GoToNode");

  return {
    icon: <IconLocation size={16} />,
    label: "Go to a node",
    description: "Label every visible node — type a label to fly straight to it",
    searchAgainst: "go to jump navigate node label hint keyboard",
    action: "open",
    keybinding,
    onSelect: () => setJumpMode(true),
  };
};
