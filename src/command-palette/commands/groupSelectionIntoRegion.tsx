import { IconMapPin } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { nodesAtom } from "../../canvas/state";
import { useGroupSelection } from "../../canvas/wayfinding/useGroupSelection";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useGroupSelectionIntoRegionCommand = (): CommandPaletteResult | null => {
  const nodes = useAtomValue(nodesAtom);
  const groupSelection = useGroupSelection();
  const keybinding = useKeybinding("Region::GroupSelection");

  if (!groupSelection) {
    return null;
  }

  const selectedCount = nodes.filter(n => n.selected).length;
  return {
    icon: <IconMapPin size={16} />,
    action: "run",
    label: `Group ${selectedCount} nodes into region`,
    searchAgainst: "group region cluster area section label waypoint wayfinding",
    keybinding,
    onSelect: groupSelection,
  };
};
