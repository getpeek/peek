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
  | "+";

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

export const useHotkey = (keys: Hotkey, callback: (event: KeyboardEvent) => void) => {
  const onKeyDown = (event: KeyboardEvent) => {
    const input = keys.split("-");
    const unit = input.find(key => key.length === 1);

    if (!input.includes("escape") && isTextInputFocused()) {
      return;
    }

    const checks: [string, boolean][] = [
      ["meta", event.metaKey],
      ["shift", event.shiftKey],
      ["alt", event.altKey],
    ];

    for (const [check, modifier] of checks) {
      if (input.includes(check) && !modifier) {
        return;
      }
    }

    if (unit && event.key.toLowerCase() !== unit) {
      return;
    }

    if (!input.includes(event.key.toLowerCase())) {
      return;
    }

    event.preventDefault();

    callback(event);
  };

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
};
