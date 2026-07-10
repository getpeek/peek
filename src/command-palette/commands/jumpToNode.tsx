import { IconLocation } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { jumpModeAtom } from "../../canvas/jump/state";
import { CommandPaletteResult } from ".";
import { useKeybinding } from "./useKeybinding";

export const useJumpToNodeCommand = (): CommandPaletteResult => {
  const setJumpMode = useSetAtom(jumpModeAtom);
  const keybinding = useKeybinding("Page::JumpToNode");

  return {
    icon: <IconLocation size={16} />,
    label: "Jump to a node",
    description: "Label every visible node — type a label to fly straight to it",
    searchAgainst: "jump navigate node label hint go to keyboard",
    action: "open",
    keybinding,
    onSelect: () => setJumpMode(true),
  };
};
