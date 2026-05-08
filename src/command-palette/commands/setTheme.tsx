import { IconPalette } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useSetAtom } from "jotai";
import { configAtom, Theme } from "../../state";
import { ThemeDetails } from "../details/ThemeDetails";
import type { CommandPaletteResult } from ".";

export const useSetThemeCommands = (): CommandPaletteResult[] => {
  const setConfig = useSetAtom(configAtom);

  const apply = (theme: Theme) => async () => {
    await invoke("set_theme", { theme });
    setConfig(prev => (prev ? { ...prev, theme } : prev));
  };

  return [
    {
      icon: <IconPalette size={16} />,
      label: "Set theme to Pine",
      searchAgainst: "purple dark",
      onSelect: apply("pine"),
      details: <ThemeDetails theme='pine' />,
    },
    {
      icon: <IconPalette size={16} />,
      label: "Set theme to Midnight",
      searchAgainst: "black dark",
      onSelect: apply("midnight"),
      details: <ThemeDetails theme='midnight' />,
    },
    {
      icon: <IconPalette size={16} />,
      label: "Set theme to Midday",
      searchAgainst: "light bright",
      onSelect: apply("midday"),
      details: <ThemeDetails theme='midday' />,
    },
  ];
};
