import { IconInfoCircle } from "@tabler/icons-react";
import { AboutDetails } from "../details/AboutDetails";
import type { CommandPaletteResult } from ".";

export const useAboutCommand = (): CommandPaletteResult => {
  return {
    icon: <IconInfoCircle size={16} />,
    label: "About",
    searchAgainst: "version",
    onSelect: () => {},
    details: <AboutDetails />,
  };
};
