import { useAtomValue, useSetAtom } from "jotai";
import { nodesAtom, regionsAtom } from "../state";
import { regionsMenuOpenAtom, renamingRegionIdAtom } from "./state";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";

/**
 * Group the currently selected nodes into a confirmed region and hand off
 * naming: the regions menu opens with the fresh region in rename mode.
 * Shared by the ⌘G hotkey and the command palette entry. Returns null when
 * grouping isn't possible (regions off or fewer than two nodes selected).
 */
export function useGroupSelection(): (() => void) | null {
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const setMenuOpen = useSetAtom(regionsMenuOpenAtom);
  const setRenamingId = useSetAtom(renamingRegionIdAtom);
  const { createRegion } = useRegionActions();
  const regionsEnabled = useRegionsEnabled();

  const selected = nodes.filter(n => n.selected);
  if (!regionsEnabled || selected.length < 2) {
    return null;
  }

  return () => {
    const id = createRegion({
      memberIds: selected.map(n => n.id),
      name: `Region ${regions.length + 1}`,
    });
    setMenuOpen(true);
    setRenamingId(id);
  };
}
