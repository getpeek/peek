import { useAtomValue } from "jotai";
import { edgesAtom, nodesAtom, regionsAtom } from "../state";
import { clusterUngrouped } from "./clusterUngrouped";
import { deriveRegions } from "./regionGeometry";
import { useAiGrouping } from "./useAiGrouping";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";

/**
 * Organize the ungrouped nodes: the model slots each one into an existing region
 * it fits or gathers it with others into a new region, reasoning over content,
 * edges and spatial layout. If the model is unreachable or its reply is unusable,
 * fall back to geometric clustering into new regions — either way the results are
 * suggestions the user reviews. Returns null when there's nothing useful to do or
 * regions are off.
 */
export function useGroupWithAi(): (() => Promise<void>) | null {
  const regionsEnabled = useRegionsEnabled();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const regions = useAtomValue(regionsAtom);
  const { createRegion, addToRegion } = useRegionActions();
  const { suggestAssignments } = useAiGrouping();

  const derived = deriveRegions(nodes, regions);
  const groupedIds = new Set(derived.flatMap(d => d.memberIds));
  const ungrouped = nodes.filter(n => !groupedIds.has(n.id) && n.type !== "draw");

  // Two ungrouped nodes can form a new region; a single one is only useful if
  // there's an existing region to fold it into.
  const canGroup = ungrouped.length >= 2 || (ungrouped.length > 0 && derived.length > 0);
  if (!regionsEnabled || !canGroup) {
    return null;
  }

  const ungroupedIds = new Set(ungrouped.map(n => n.id));
  const ungroupedEdges = edges.filter(
    e => ungroupedIds.has(e.source) && ungroupedIds.has(e.target),
  );
  const regionHints = derived.map(d => ({
    id: d.region.id,
    name: d.region.name,
    desc: d.region.desc,
  }));

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
    const assignments = await suggestAssignments(ungrouped, ungroupedEdges, regionHints).catch(
      () => null,
    );
    if (!assignments) {
      geometricFallback();
      return;
    }
    for (const assignment of assignments) {
      if ("existingRegionId" in assignment) {
        addToRegion(assignment.existingRegionId, assignment.nodeIds);
        continue;
      }
      createRegion({
        memberIds: assignment.nodeIds,
        name: assignment.name,
        desc: assignment.desc,
        status: "suggested",
      });
    }
  };
}
