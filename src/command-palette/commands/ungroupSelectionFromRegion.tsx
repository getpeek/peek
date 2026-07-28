import { IconMapPinOff } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { nodesAtom, regionsAtom } from "../../canvas/state";
import { useUngroupSelection } from "../../canvas/wayfinding/useUngroupSelection";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useUngroupSelectionFromRegionCommand = (): CommandPaletteResult | null => {
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const ungroupSelection = useUngroupSelection();
  const keybinding = useKeybinding("Region::UngroupSelection");

  if (!ungroupSelection) {
    return null;
  }

  const grouped = new Set(regions.flatMap(r => r.memberIds));
  const count = nodes.filter(n => n.selected && grouped.has(n.id)).length;
  return {
    icon: <IconMapPinOff size={16} />,
    action: "run",
    label: `Ungroup ${count} nodes from their region`,
    searchAgainst: "ungroup remove region cluster area section detach wayfinding",
    keybinding,
    onSelect: ungroupSelection,
  };
};
