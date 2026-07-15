import { getDefaultStore } from "jotai";
import { documentAtom } from "../canvas/state";
import { configAtom } from "../state";
import { ids } from "../canvas/ids";
import { REGION_COLOR_COUNT } from "../canvas/wayfinding/regionGeometry";
import type { RegionState, RegionStatus } from "../canvas/types";
import { resolvePageId } from "./createNodes";

type GroupNodesResult = { regionId: string; pageId: string } | { error: string };

type RegionSummary = {
  regionId: string;
  name: string;
  desc: string;
  status: RegionStatus;
  nodeIds: string[];
};

type ListRegionsResult =
  | { pageId: string; regions: RegionSummary[]; ungroupedNodeIds: string[] }
  | { error: string };

function regionsDisabledError(): { error: string } | null {
  const config = getDefaultStore().get(configAtom);
  if (config && !config.canvas.enable_regions) {
    return { error: "regions are disabled (settings: canvas.enable_regions)" };
  }
  return null;
}

export function groupNodes(params: Record<string, unknown>): GroupNodesResult {
  const disabled = regionsDisabledError();
  if (disabled) {
    return disabled;
  }

  const doc = getDefaultStore().get(documentAtom);
  const pageId = resolvePageId(doc, params.pageId);
  if (!pageId) {
    return { error: `page ${String(params.pageId)} not found` };
  }

  const name = typeof params.name === "string" ? params.name.trim() : "";
  if (name.length === 0) {
    return { error: "name is required" };
  }

  const nodeIds = [...new Set(Array.isArray(params.nodeIds) ? (params.nodeIds as string[]) : [])];
  if (nodeIds.length < 2) {
    return { error: "pass at least two node ids to group" };
  }
  const pageNodeIds = new Set(doc.pages[pageId].nodes.map(n => n.id));
  const missing = nodeIds.filter(id => !pageNodeIds.has(id));
  if (missing.length > 0) {
    return { error: `nodes not on page ${pageId}: ${missing.join(", ")}` };
  }

  const regionId = ids.region();
  getDefaultStore().set(documentAtom, d => {
    const page = d.pages[pageId];
    // A node belongs to one region: claim members from any region that already
    // holds them, and drop regions the claim empties out.
    const memberSet = new Set(nodeIds);
    const others = (page.regions ?? [])
      .map(r => ({ ...r, memberIds: r.memberIds.filter(id => !memberSet.has(id)) }))
      .filter(r => r.memberIds.length > 0);
    const region: RegionState = {
      id: regionId,
      name,
      desc: typeof params.desc === "string" ? params.desc : "",
      colorIndex: others.length % REGION_COLOR_COUNT,
      status: params.suggested === false ? "confirmed" : "suggested",
      memberIds: nodeIds,
    };
    return { ...d, pages: { ...d.pages, [pageId]: { ...page, regions: [...others, region] } } };
  });

  return { regionId, pageId };
}

export function addNodesToRegion(params: Record<string, unknown>): GroupNodesResult {
  const disabled = regionsDisabledError();
  if (disabled) {
    return disabled;
  }

  const regionId = typeof params.regionId === "string" ? params.regionId : "";
  const doc = getDefaultStore().get(documentAtom);
  const pageId = doc.pageOrder.find(id =>
    (doc.pages[id].regions ?? []).some(r => r.id === regionId),
  );
  if (!pageId) {
    return { error: `region ${regionId} not found` };
  }

  const nodeIds = [...new Set(Array.isArray(params.nodeIds) ? (params.nodeIds as string[]) : [])];
  if (nodeIds.length === 0) {
    return { error: "pass at least one node id to add" };
  }
  const pageNodeIds = new Set(doc.pages[pageId].nodes.map(n => n.id));
  const missing = nodeIds.filter(id => !pageNodeIds.has(id));
  if (missing.length > 0) {
    return { error: `nodes not on page ${pageId}: ${missing.join(", ")}` };
  }

  getDefaultStore().set(documentAtom, d => {
    const page = d.pages[pageId];
    // A node belongs to one region: claim the ids from any region that holds
    // them (dropping ones the claim empties), then append to the target region.
    const memberSet = new Set(nodeIds);
    const regions = (page.regions ?? [])
      .map(r =>
        r.id === regionId
          ? { ...r, memberIds: [...r.memberIds.filter(id => !memberSet.has(id)), ...nodeIds] }
          : { ...r, memberIds: r.memberIds.filter(id => !memberSet.has(id)) },
      )
      .filter(r => r.id === regionId || r.memberIds.length > 0);
    return { ...d, pages: { ...d.pages, [pageId]: { ...page, regions } } };
  });

  return { regionId, pageId };
}

export function listRegions(params: Record<string, unknown>): ListRegionsResult {
  const doc = getDefaultStore().get(documentAtom);
  const pageId = resolvePageId(doc, params.pageId);
  if (!pageId) {
    return { error: `page ${String(params.pageId)} not found` };
  }

  const page = doc.pages[pageId];
  const liveIds = new Set(page.nodes.map(n => n.id));
  const regions = (page.regions ?? []).map(r => ({
    regionId: r.id,
    name: r.name,
    desc: r.desc,
    status: r.status,
    nodeIds: r.memberIds.filter(id => liveIds.has(id)),
  }));

  const grouped = new Set(regions.flatMap(r => r.nodeIds));
  const ungroupedNodeIds = page.nodes
    .filter(n => !grouped.has(n.id) && n.type !== "draw")
    .map(n => n.id);

  return { pageId, regions, ungroupedNodeIds };
}

export function removeRegion(params: Record<string, unknown>): GroupNodesResult {
  const regionId = typeof params.regionId === "string" ? params.regionId : "";
  const doc = getDefaultStore().get(documentAtom);
  const pageId = doc.pageOrder.find(id =>
    (doc.pages[id].regions ?? []).some(r => r.id === regionId),
  );
  if (!pageId) {
    return { error: `region ${regionId} not found` };
  }

  getDefaultStore().set(documentAtom, d => {
    const page = d.pages[pageId];
    return {
      ...d,
      pages: {
        ...d.pages,
        [pageId]: { ...page, regions: (page.regions ?? []).filter(r => r.id !== regionId) },
      },
    };
  });
  return { regionId, pageId };
}
