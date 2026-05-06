import { ReactNode } from "react";

export interface CommandPaletteResult {
  icon: ReactNode;
  label: string;
  description?: string;
  searchAgainst?: string;
  onSelect: () => void | Promise<unknown>;
  keybinding?: string[];
  details?: ReactNode;
}
