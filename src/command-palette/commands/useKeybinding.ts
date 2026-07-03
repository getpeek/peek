import { useKeymap, type KeymapAction } from "../../app/keymap";
import { formatCombo } from "../../keymap-help/keymapActions";

// Resolve a command's primary binding from the live keymap for display in the palette. Returns
// undefined when the action is unbound so the command falls back to its action glyph.
export const useKeybinding = (action: KeymapAction): string[] | undefined => {
  const combo = useKeymap()[action][0];
  return combo ? formatCombo(combo) : undefined;
};
