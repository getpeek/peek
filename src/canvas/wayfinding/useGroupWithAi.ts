import { useAtomValue } from "jotai";
import { edgesAtom, nodesAtom, regionsAtom } from "../state";
import { clusterUngrouped } from "./clusterUngrouped";
import { deriveRegions } from "./regionGeometry";
import { useAiGrouping } from "./useAiGrouping";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";

/**
 * Let the model partition the ungrouped nodes into suggested regions, reasoning
 * over content, edges and spatial layout. If the model is unreachable or its
 * reply is unusable, fall back to geometric clustering with placeholder names —
 * either way the results are suggestions the user reviews. Returns null when
 * there's nothing to group or regions are off.
 */
export function useGroupWithAi(): (() => Promise<void>) | null {
  const regionsEnabled = useRegionsEnabled();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const regions = useAtomValue(regionsAtom);
  const { createRegion } = useRegionActions();
  const { suggestGroups } = useAiGrouping();

  const groupedIds = new Set(deriveRegions(nodes, regions).flatMap(d => d.memberIds));
  const ungrouped = nodes.filter(n => !groupedIds.has(n.id) && n.type !== "draw");
  if (!regionsEnabled || ungrouped.length < 2) {
    return null;
  }

  const ungroupedIds = new Set(ungrouped.map(n => n.id));
  const ungroupedEdges = edges.filter(
    e => ungroupedIds.has(e.source) && ungroupedIds.has(e.target),
  );

  const geometricFallback = () => {
    const clusters = clusterUngrouped(nodes, edges, groupedIds);
    clusters.forEach((cluster, index) =>
      createRegion({
        memberIds: cluster.map(n => n.id),
        name: `Group ${regions.length + index + 1}`,
        status: "suggested",
      }),
    );
  };

  return async () => {
    const groups = await suggestGroups(ungrouped, ungroupedEdges).catch(() => null);
    if (!groups) {
      geometricFallback();
      return;
    }
    for (const group of groups) {
      createRegion({
        memberIds: group.nodeIds,
        name: group.name,
        desc: group.desc,
        status: "suggested",
      });
    }
  };
}
