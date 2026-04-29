import { CommandPaletteResult } from "./index";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { darkModeAtom } from "../../state";
import { Text } from "@mantine/core";

export const useToggleDarkModeCommand = (): CommandPaletteResult => {
  const [isDarkMode, setIsDarkMode] = useAtom(darkModeAtom);

  return {
    icon: isDarkMode ? <IconSun size={16} /> : <IconMoon size={16} />,
    label: <Text size="xs">{isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</Text>,
    searchAgainst: "toggle dark mode light theme switch appearance",
    onSelect: () => {
      setIsDarkMode(!isDarkMode);
    },
  };
};
