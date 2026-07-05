import { IconDatabase } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { connectionPickerOpenAtom } from "../../state";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useOpenConnectionPickerCommand = (): CommandPaletteResult => {
  const setConnectionPickerOpen = useSetAtom(connectionPickerOpenAtom);

  return {
    icon: <IconDatabase size={16} />,
    action: "open",
    label: "Change connection",
    searchAgainst: "open connection picker database switch workspace",
    keybinding: useKeybinding("ConnectionPicker::Open"),
    onSelect: () => setConnectionPickerOpen(true),
  };
};
