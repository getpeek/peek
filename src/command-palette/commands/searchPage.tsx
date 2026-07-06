import { IconSearch } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { pageSearchOpenAtom } from "../../state";
import { CommandPaletteResult } from ".";
import { useKeybinding } from "./useKeybinding";

export const useSearchPageCommand = (): CommandPaletteResult => {
  const setOpen = useSetAtom(pageSearchOpenAtom);
  const keybinding = useKeybinding("Page::Search");

  return {
    icon: <IconSearch size={16} />,
    label: "Search nodes on page",
    description: "Fuzzy-find any node by its contents and jump to it",
    searchAgainst: "find fuzzy search node jump go to",
    action: "open",
    keybinding,
    onSelect: () => setOpen(true),
  };
};
