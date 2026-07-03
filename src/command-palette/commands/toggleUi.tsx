import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { uiVisibilityAtom } from "../../state";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useToggleUiCommand = (): CommandPaletteResult => {
  const [visible, setVisible] = useAtom(uiVisibilityAtom);
  const keybinding = useKeybinding("View::ToggleUi");
  return visible
    ? {
        icon: <IconEyeOff size={16} />,
        label: "Hide UI",
        searchAgainst: "minimize chrome zen focus",
        keybinding,
        onSelect: () => setVisible(false),
      }
    : {
        icon: <IconEye size={16} />,
        label: "Show UI",
        searchAgainst: "restore chrome",
        keybinding,
        onSelect: () => setVisible(true),
      };
};
