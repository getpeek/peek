import { IconKeyboard } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { keymapHelpOpenAtom } from "../../state";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useShowKeymapCommand = (): CommandPaletteResult => {
  const setKeymapHelpOpen = useSetAtom(keymapHelpOpenAtom);

  return {
    icon: <IconKeyboard size={16} />,
    action: "run",
    label: "Show keymap",
    searchAgainst: "keybindings keyboard shortcuts hotkeys cheatsheet reference",
    keybinding: useKeybinding("Help::Keymap"),
    onSelect: () => setKeymapHelpOpen(true),
  };
};
