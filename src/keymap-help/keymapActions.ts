import type { KeymapAction } from "../app/keymap";
import type { Hotkey } from "../app/useHotkey";

export interface KeymapEntry {
  action: KeymapAction;
  description: string;
}

export interface KeymapSection {
  title: string;
  entries: KeymapEntry[];
}

// Display data for the read-only keymap modal. Descriptions mirror docs/keymap.md — they can't be
// shared (markdown can't import TS), so keep the two in sync when bindings change.
export const KEYMAP_REFERENCE: KeymapSection[] = [
  {
    title: "Tools",
    entries: [
      { action: "Tool::Select", description: "Deselect everything and leave the current tool" },
      { action: "Tool::LassoSelect", description: "Lasso selection tool" },
      { action: "Tool::Query", description: "Place a query node" },
      { action: "Tool::Agent", description: "Place an agent node" },
      { action: "Tool::Text", description: "Place a text node" },
      { action: "Tool::Variable", description: "Place a variable node" },
      { action: "Tool::Draw", description: "Draw / pen tool" },
    ],
  },
  {
    title: "Edit",
    entries: [
      { action: "Edit::Cut", description: "Cut selected nodes" },
      { action: "Edit::Copy", description: "Copy selected nodes" },
      { action: "Edit::Paste", description: "Paste nodes" },
      { action: "Edit::SelectAll", description: "Select every node on the page" },
      { action: "Edit::DeleteSelection", description: "Delete selected nodes" },
    ],
  },
  {
    title: "History",
    entries: [
      { action: "History::Undo", description: "Undo" },
      { action: "History::Redo", description: "Redo" },
    ],
  },
  {
    title: "Zoom",
    entries: [
      { action: "Zoom::Reset", description: "Reset zoom to 100%" },
      { action: "Zoom::FitView", description: "Fit all nodes in view" },
    ],
  },
  {
    title: "Page",
    entries: [
      { action: "Page::New", description: "New page" },
      { action: "Page::Close", description: "Close the active page" },
      { action: "Page::Previous", description: "Previous page" },
      { action: "Page::Next", description: "Next page" },
      { action: "Page::SelectPreviousQuery", description: "Select the previous query node" },
      { action: "Page::SelectNextQuery", description: "Select the next query node" },
      { action: "Page::SelectNodeLeft", description: "Select the node to the left" },
      { action: "Page::SelectNodeRight", description: "Select the node to the right" },
      { action: "Page::SelectNodeUp", description: "Select the node above" },
      { action: "Page::SelectNodeDown", description: "Select the node below" },
      {
        action: "Page::GoToNode",
        description: "Label every visible node — type a label to fly straight to it",
      },
      {
        action: "Page::Search",
        description: "Search all nodes on the page (searches within a selected result instead)",
      },
      {
        action: "Page::OpenPicker",
        description: "Open the pages picker (list display mode only)",
      },
    ],
  },
  {
    title: "View",
    entries: [
      { action: "View::ToggleUi", description: "Show/hide the UI chrome" },
      { action: "View::ToggleCameraLock", description: "Lock/unlock canvas pan & zoom" },
    ],
  },
  {
    title: "Result",
    entries: [{ action: "Result::Pivot", description: "Pivot/transpose selected result nodes" }],
  },
  {
    title: "Regions",
    entries: [
      { action: "Region::GroupSelection", description: "Group selected nodes into a region" },
      {
        action: "Region::UngroupSelection",
        description: "Remove selected nodes from their region",
      },
      { action: "Region::OpenPicker", description: "Open the regions picker" },
    ],
  },
  {
    title: "Other",
    entries: [
      { action: "CommandPalette::Open", description: "Open the command palette" },
      { action: "ConnectionPicker::Open", description: "Open the connection picker" },
      { action: "App::Quit", description: "Quit Peek" },
    ],
  },
  {
    title: "Help",
    entries: [{ action: "Help::Keymap", description: "Show this keymap reference" }],
  },
];

const TOKEN_LABELS: Record<string, string> = {
  meta: "⌘",
  shift: "⇧",
  alt: "⌥",
  ctrl: "⌃",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  escape: "esc",
  enter: "↵",
  space: "space",
  tab: "⇥",
  backspace: "⌫",
};

// Split a combo ("meta-shift-?") into display tokens for <kbd> rendering, mapping modifiers and
// named keys to symbols and upper-casing lone letters (⌘ ⇧ ? rather than meta-shift-?).
export const formatCombo = (combo: Hotkey): string[] =>
  combo
    .split("-")
    .map(token => TOKEN_LABELS[token] ?? (token.length === 1 ? token.toUpperCase() : token));
