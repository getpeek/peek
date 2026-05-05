import { IconPalette } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { useSetAtom } from "jotai";
import { configAtom, Theme } from "../../state";
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
      label: <Text size='xs'>Set theme to Pine</Text>,
      searchAgainst: "set theme pine purple dark",
      onSelect: apply("pine"),
    },
    {
      icon: <IconPalette size={16} />,
      label: <Text size='xs'>Set theme to Midnight</Text>,
      searchAgainst: "set theme midnight black dark",
      onSelect: apply("midnight"),
    },
    {
      icon: <IconPalette size={16} />,
      label: <Text size='xs'>Set theme to Midday</Text>,
      searchAgainst: "set theme midday light bright",
      onSelect: apply("midday"),
    },
  ];
};
