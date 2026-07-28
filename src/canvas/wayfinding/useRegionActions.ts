import { useAtomValue, useSetAtom } from "jotai";
import { ids } from "../ids";
import { regionsAtom } from "../state";
import { useCanvasApi } from "../hooks/useCanvas";
import type { RegionStatus } from "../types";
import { REGION_COLOR_COUNT } from "./regionGeometry";

const FLY_DURATION_MS = 600;

export function useRegionActions() {
  const canvas = useCanvasApi();
  const regions = useAtomValue(regionsAtom);
  const setRegions = useSetAtom(regionsAtom);

  const createRegion = (opts: {
    memberIds: string[];
    name: string;
    desc?: string;
    status?: RegionStatus;
  }): string => {
    const id = ids.region();
    const claimed = new Set(opts.memberIds);
    setRegions(prev => {
      // A node belongs to one region: strip the new members from any region that
      // already holds them, dropping the ones the claim empties out.
      const others = prev
        .map(r => ({ ...r, memberIds: r.memberIds.filter(memberId => !claimed.has(memberId)) }))
        .filter(r => r.memberIds.length > 0);
      return [
        ...others,
        {
          id,
          name: opts.name,
          desc: opts.desc ?? "",
          colorIndex: others.length % REGION_COLOR_COUNT,
          status: opts.status ?? "confirmed",
          memberIds: opts.memberIds,
        },
      ];
    });
    return id;
  };

  // Replace the whole region set in one write — used by "regroup all with AI",
  // which reshapes every region rather than adding to the existing ones.
  const replaceRegions = (groups: { memberIds: string[]; name: string; desc?: string }[]) => {
    setRegions(() =>
      groups.map((group, index) => ({
        id: ids.region(),
        name: group.name,
        desc: group.desc ?? "",
        colorIndex: index % REGION_COLOR_COUNT,
        status: "suggested" as const,
        memberIds: group.memberIds,
      })),
    );
  };

  // Fold nodes into an existing region. A node lives in one region, so claim the
  // ids from any other region (dropping ones the claim empties) before appending.
  const addToRegion = (regionId: string, nodeIds: string[]) => {
    const claimed = new Set(nodeIds);
    setRegions(prev =>
      prev
        .map(r =>
          r.id === regionId
            ? { ...r, memberIds: [...r.memberIds.filter(id => !claimed.has(id)), ...nodeIds] }
            : { ...r, memberIds: r.memberIds.filter(id => !claimed.has(id)) },
        )
        .filter(r => r.id === regionId || r.memberIds.length > 0),
    );
  };

  // Pull nodes out of whatever region holds them. `pruneEmptyRegions` only runs on
  // node writes, so drop the regions this empties out here.
  const removeFromRegions = (nodeIds: string[]) => {
    const removed = new Set(nodeIds);
    setRegions(prev =>
      prev
        .map(r => ({ ...r, memberIds: r.memberIds.filter(id => !removed.has(id)) }))
        .filter(r => r.memberIds.length > 0),
    );
  };

  // Renaming doubles as accepting an AI suggestion, so it always confirms.
  const renameRegion = (id: string, name: string) => {
    setRegions(prev =>
      prev.map(r => (r.id === id ? { ...r, name, status: "confirmed" as const } : r)),
    );
  };

  const confirmRegion = (id: string) => {
    setRegions(prev => prev.map(r => (r.id === id ? { ...r, status: "confirmed" as const } : r)));
  };

  const removeRegion = (id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const flyToRegion = (id: string) => {
    if (!canvas) {
      return;
    }
    const region = regions.find(r => r.id === id);
    const liveMemberIds = (region?.memberIds ?? []).filter(memberId => canvas.getNode(memberId));
    if (liveMemberIds.length === 0) {
      return;
    }
    canvas.zoomToNodes(liveMemberIds, { padding: 0.15, duration: FLY_DURATION_MS });
  };

  return {
    createRegion,
    replaceRegions,
    addToRegion,
    removeFromRegions,
    renameRegion,
    confirmRegion,
    removeRegion,
    flyToRegion,
  };
}
