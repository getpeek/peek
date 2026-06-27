import { useEffect } from "react";
import { isTextInputFocused } from "../canvas/ui/KeyboardShortcuts";

type Units =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "!"
  | "@"
  | "#"
  | "$"
  | "%"
  | "^"
  | "&"
  | "*"
  | "/"
  | "("
  | ")"
  | "["
  | "]"
  | "?"
  | "+"
  | ".";

export type HotkeyModifiers = "meta" | "shift" | "alt" | "ctrl";
export type HotkeyClosers = "escape" | "enter" | "space" | "tab" | "backspace";
export type HotkeyArrow = "arrowup" | "arrowdown" | "arrowleft" | "arrowright";

export type Hotkey =
  | `${Units}`
  | `${HotkeyClosers}`
  | `${HotkeyModifiers}`
  | `${HotkeyArrow}`
  | `${HotkeyModifiers}-${HotkeyClosers}`
  | `${HotkeyModifiers}-${HotkeyArrow}`
  | `${HotkeyModifiers}-${Units}`
  | `${HotkeyModifiers}-${HotkeyModifiers}-${Units}`;

const MODIFIER_KEYS: readonly string[] = ["meta", "shift", "alt", "ctrl"];

const matchesHotkey = (keys: Hotkey, event: KeyboardEvent): boolean => {
  const input = keys.split("-");
  const trigger = input.find(key => !MODIFIER_KEYS.includes(key)) ?? input.at(-1);

  if (!input.includes("escape") && isTextInputFocused()) {
    return false;
  }

  const checks: [string, boolean][] = [
    ["meta", event.metaKey],
    ["shift", event.shiftKey],
    ["alt", event.altKey],
    ["ctrl", event.ctrlKey],
  ];

  // Exact match: every listed modifier must be held and every unlisted one
  // must not be. Otherwise `p` would also fire on shift-p, and shift-p would
  // also fire on the command palette's meta-shift-p.
  for (const [check, modifier] of checks) {
    if (input.includes(check) !== modifier) {
      return false;
    }
  }

  return event.key.toLowerCase() === trigger;
};

// Accepts an array so a single action can be bound to several keys (and `undefined` while the
// keymap is still loading), firing on the first combo that matches.
export const useHotkey = (
  keys: Hotkey | Hotkey[] | undefined,
  callback: (event: KeyboardEvent) => void,
) => {
  const onKeyDown = (event: KeyboardEvent) => {
    const combos = keys === undefined ? [] : Array.isArray(keys) ? keys : [keys];
    if (combos.some(combo => matchesHotkey(combo, event))) {
      event.preventDefault();
      callback(event);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
};
