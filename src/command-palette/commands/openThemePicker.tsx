import { IconPalette } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { themePickerOpenAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useOpenThemePickerCommand = (): CommandPaletteResult => {
  const setThemePickerOpen = useSetAtom(themePickerOpenAtom);

  return {
    icon: <IconPalette size={16} />,
    action: "open",
    label: "Change theme",
    searchAgainst:
      "theme appearance color dark light pine midnight midday terminal paper blueprint",
    onSelect: () => setThemePickerOpen(true),
  };
};
