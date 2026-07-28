import { useAtomValue } from "jotai";
import { nodesAtom, regionsAtom } from "../state";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";

/**
 * Pull the selected nodes out of the region holding them, dropping regions the
 * removal empties. Shared by the ⌘⇧G hotkey and the command palette entry.
 * Returns null when regions are off or nothing selected is grouped.
 */
export function useUngroupSelection(): (() => void) | null {
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const { removeFromRegions } = useRegionActions();
  const regionsEnabled = useRegionsEnabled();

  const grouped = new Set(regions.flatMap(r => r.memberIds));
  const ids = nodes.filter(n => n.selected && grouped.has(n.id)).map(n => n.id);
  if (!regionsEnabled || ids.length === 0) {
    return null;
  }

  return () => removeFromRegions(ids);
}
