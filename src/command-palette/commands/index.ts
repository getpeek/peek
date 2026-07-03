import { ReactNode } from "react";

export type CommandAction = "run" | "open" | "switch";

export const ACTION_GLYPH: Record<CommandAction, { glyph: string; label: string }> = {
  run: { glyph: "▷", label: "run" },
  open: { glyph: "⇱", label: "open" },
  switch: { glyph: "⇄", label: "switch" },
};

export interface CommandPaletteResult {
  icon: ReactNode;
  label: string;
  description?: string;
  searchAgainst?: string;
  onSelect: () => void | Promise<unknown>;
  keybinding?: string[];
  action?: CommandAction;
  details?: ReactNode;
}
