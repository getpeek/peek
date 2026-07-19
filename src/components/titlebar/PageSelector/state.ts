import { atom } from "jotai";

// Open state of the pages picker popover (list display mode). Shared so the
// titlebar pill and the Page::OpenPicker hotkey toggle the same menu.
export const pagesMenuOpenAtom = atom(false);

// Page currently being renamed inline in the pages picker.
export const renamingPageIdAtom = atom<string | null>(null);
