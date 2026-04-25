import { ReactNode } from "react";

export interface CommandPaletteResult {
  icon: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  searchAgainst: string;
  onSelect: () => void | Promise<unknown>;
}
