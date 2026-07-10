import { atom, useAtomValue } from "jotai";
import { configAtom } from "../state";
import type { Hotkey } from "./useHotkey";

export type KeymapAction =
  | "Tool::Select"
  | "Tool::LassoSelect"
  | "Tool::Query"
  | "Tool::Agent"
  | "Tool::Text"
  | "Tool::Variable"
  | "Tool::Draw"
  | "Edit::Cut"
  | "Edit::Copy"
  | "Edit::Paste"
  | "Edit::SelectAll"
  | "Edit::DeleteSelection"
  | "History::Undo"
  | "History::Redo"
  | "Zoom::Reset"
  | "Zoom::FitView"
  | "Page::New"
  | "Page::Close"
  | "Page::Previous"
  | "Page::Next"
  | "Page::SelectPreviousQuery"
  | "Page::SelectNextQuery"
  | "Page::SelectNodeLeft"
  | "Page::SelectNodeRight"
  | "Page::SelectNodeUp"
  | "Page::SelectNodeDown"
  | "Page::GoToNode"
  | "Page::Search"
  | "View::ToggleUi"
  | "View::ToggleCameraLock"
  | "Result::Pivot"
  | "Region::GroupSelection"
  | "Region::OpenPicker"
  | "CommandPalette::Open"
  | "ConnectionPicker::Open"
  | "App::Quit"
  | "Help::Keymap";

export type Keymap = Record<KeymapAction, Hotkey[]>;

// Rust ships the resolved keymap as `key -> action`. We invert it to `action -> keys` so call
// sites read a binding by action — `keymap["Tool::Query"]`. The Proxy keeps every action
// defined: an unbound or not-yet-loaded action returns `[]` (a no-op), so `useHotkey` never
// receives `undefined` during the async config load.
export const createKeymap = (resolved: Record<string, string> | undefined): Keymap => {
  const inverse = new Map<string, Hotkey[]>();
  for (const [key, action] of Object.entries(resolved ?? {})) {
    inverse.set(action, [...(inverse.get(action) ?? []), key as Hotkey]);
  }
  return new Proxy({} as Keymap, {
    get: (_target, prop) => (typeof prop === "string" ? (inverse.get(prop) ?? []) : []),
  });
};

export const keymapAtom = atom<Keymap>(get => createKeymap(get(configAtom)?.keymap));

export const useKeymap = (): Keymap => useAtomValue(keymapAtom);
