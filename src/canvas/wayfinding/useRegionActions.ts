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
    setRegions(prev => [
      ...prev,
      {
        id,
        name: opts.name,
        desc: opts.desc ?? "",
        colorIndex: prev.length % REGION_COLOR_COUNT,
        status: opts.status ?? "confirmed",
        memberIds: opts.memberIds,
      },
    ]);
    return id;
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

  return { createRegion, renameRegion, confirmRegion, removeRegion, flyToRegion };
}
