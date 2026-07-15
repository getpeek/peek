import { useAtomValue } from "jotai";
import { edgesAtom, nodesAtom } from "../state";
import { clusterUngrouped } from "./clusterUngrouped";
import { useAiGrouping } from "./useAiGrouping";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";

/**
 * Re-partition the WHOLE page from scratch. Unlike useGroupWithAi (which only
 * touches ungrouped nodes and appends), this reshapes every region: the model
 * sees all nodes and its answer replaces the region set entirely. On failure it
 * falls back to geometric clustering — either way the result is suggestions the
 * user reviews. Returns null when there's too little to group or regions are off.
 */
export function useRegroupAllWithAi(): (() => Promise<void>) | null {
  const regionsEnabled = useRegionsEnabled();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const { replaceRegions } = useRegionActions();
  const { suggestGroups } = useAiGrouping();

  const groupable = nodes.filter(n => n.type !== "draw");
  if (!regionsEnabled || groupable.length < 2) {
    return null;
  }

  const groupableIds = new Set(groupable.map(n => n.id));
  const groupableEdges = edges.filter(
    e => groupableIds.has(e.source) && groupableIds.has(e.target),
  );

  const geometricFallback = () => {
    const clusters = clusterUngrouped(nodes, edges, new Set());
    replaceRegions(
      clusters.map((cluster, index) => ({
        memberIds: cluster.map(n => n.id),
        name: `Group ${index + 1}`,
      })),
    );
  };

  return async () => {
    const groups = await suggestGroups(groupable, groupableEdges).catch(() => null);
    if (!groups) {
      geometricFallback();
      return;
    }
    replaceRegions(
      groups.map(group => ({ memberIds: group.nodeIds, name: group.name, desc: group.desc })),
    );
  };
}
