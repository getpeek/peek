import { atom } from "jotai";

// True while jump-to-node mode is on: every visible node wears a letter label
// and the next keystrokes pick a target instead of firing canvas hotkeys.
export const jumpModeAtom = atom(false);
