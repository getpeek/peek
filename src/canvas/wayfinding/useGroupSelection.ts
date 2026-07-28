import { useAtomValue, useSetAtom } from "jotai";
import { nodesAtom, regionsAtom } from "../state";
import { flashRegionAtom, regionsMenuOpenAtom, renamingRegionIdAtom } from "./state";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";

type GroupSelection = {
  run: () => void;
  /** Name of the region the selection folds into, or null when it creates a new one. */
  foldTargetName: string | null;
};

/**
 * Group the currently selected nodes. A selection that touches exactly one
 * region folds into it, keeping its name — that is how you grow a region by
 * hand. Touching none, or several, creates a confirmed region instead and hands
 * off naming: the regions menu opens with it in rename mode. Shared by the ⌘G
 * hotkey and the command palette entry. Returns null when grouping isn't
 * possible (regions off, fewer than two nodes selected, or the selection is
 * already exactly one region's members).
 */
export function useGroupSelection(): GroupSelection | null {
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const setMenuOpen = useSetAtom(regionsMenuOpenAtom);
  const setRenamingId = useSetAtom(renamingRegionIdAtom);
  const flashRegion = useSetAtom(flashRegionAtom);
  const { createRegion, addToRegion } = useRegionActions();
  const regionsEnabled = useRegionsEnabled();

  const selected = nodes.filter(n => n.selected);
  if (!regionsEnabled || selected.length < 2) {
    return null;
  }

  const selectedIds = selected.map(n => n.id);
  const claimed = new Set(selectedIds);
  const involved = regions.filter(r => r.memberIds.some(id => claimed.has(id)));
  const foldTarget = involved.length === 1 ? involved[0] : null;

  // Everything selected already sits in that one region — nothing to fold in.
  if (foldTarget && selectedIds.every(id => foldTarget.memberIds.includes(id))) {
    return null;
  }

  if (foldTarget) {
    return {
      foldTargetName: foldTarget.name,
      run: () => {
        addToRegion(foldTarget.id, selectedIds);
        flashRegion(foldTarget.id);
      },
    };
  }

  return {
    foldTargetName: null,
    run: () => {
      const id = createRegion({ memberIds: selectedIds, name: `Region ${regions.length + 1}` });
      setMenuOpen(true);
      setRenamingId(id);
    },
  };
}
