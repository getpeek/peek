import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { useAtomValue } from "jotai";
import { configAtom } from "../../state";
import { resultsAtom } from "../state";
import { describeNode } from "../../page-search/searchCorpus";
import type { AppEdge, AppNode } from "../types";

const GROUPING_TIMEOUT_MS = 30_000;
const MAX_PROMPT_NODES = 40;
const MAX_SNIPPET_CHARS = 100;
const MAX_NAME_CHARS = 40;
const MAX_DESC_CHARS = 60;

// The model decides the grouping, not just the names — geometric clustering
// (clusterUngrouped) is only the fallback. The instructions matter: a single
// connected graph routinely branches into several distinct investigations, so
// edge-connectivity alone must NOT collapse everything into one region.
const SYSTEM_PROMPT = `/no_think You organize a database-exploration canvas into regions (named groups of nodes).

You are given a numbered list of nodes with their kind, content and [x,y] position, plus the edges between them. Decide how to partition the nodes into regions.

How to group:
- Edges show flow (a query → its result → a chart is one thread), but being connected does NOT force nodes into one region. A single connected graph usually fans out from a root into SEVERAL distinct investigations — split each branch into its own region.
- Prefer several precise regions over one broad catch-all. If nodes cover clearly different topics (e.g. billing vs. churn vs. onboarding), they belong in different regions even when linked.
- Use spatial position as a hint: nodes clustered together in [x,y] usually belong together; a large gap suggests a boundary.
- Every node goes in exactly one region. Skip a node only if it truly fits nowhere.
- Aim for 2-6 nodes per region; name each by what it investigates.

Reply with ONLY a JSON array, no prose or markdown:
[{"name":"Short Name","desc":"one line, <=8 words","nodes":[1,2,3]}]
"name" is 2-4 words. Use the node NUMBERS from the list.`;

// The living-document variant: existing regions are shown so the model can slot
// an ungrouped node into one it fits, instead of always minting a new region.
const SYSTEM_PROMPT_ASSIGN = `/no_think You maintain the regions (named groups of nodes) on a database-exploration canvas.

Some nodes are already organized into existing regions. You are given those regions, then the currently ungrouped nodes with their kind, content and [x,y] position, plus the edges between the ungrouped nodes. Decide where each ungrouped node belongs.

How to decide:
- If a node clearly fits the topic of an existing region, ADD it there — reference the region by its [R#] label.
- Otherwise group it with other ungrouped nodes into a NEW region.
- Prefer several precise regions over one broad catch-all. Edges show flow but do NOT force nodes together.
- Use spatial position as a hint. Leave a node out only if it truly fits nowhere.

Reply with ONLY a JSON array, no prose or markdown:
[{"into":"R1","nodes":[1,2]},{"name":"Short Name","desc":"one line, <=8 words","nodes":[3,4]}]
Use "into" with an existing [R#] label to extend that region (a single node is fine), or "name"+"desc" for a new region (needs at least 2 nodes). "name" is 2-4 words. Use the node NUMBERS from the ungrouped list.`;

export type SuggestedGroup = { name: string; desc: string; nodeIds: string[] };

// Either fold nodes into an existing region, or create a new one.
export type GroupAssignment =
  | { existingRegionId: string; nodeIds: string[] }
  | { name: string; desc: string; nodeIds: string[] };

export type RegionHint = { id: string; name: string; desc: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AI grouping timed out")), ms);
    }),
  ]);
}

// Pull the first JSON array out of the reply (models wrap it in prose or fences
// despite instructions), then validate each group into real node ids.
function parseGroups(raw: string, indexToId: string[]): SuggestedGroup[] {
  const cleaned = raw.replaceAll(/<think>[\s\S]*?<\/think>/giu, "");
  const match = cleaned.match(/\[[\s\S]*\]/u);
  if (!match) {
    throw new Error("AI returned no JSON array");
  }
  const parsed = JSON.parse(match[0]) as unknown;
  if (!Array.isArray(parsed)) {
    throw new TypeError("AI grouping is not an array");
  }

  const claimed = new Set<string>();
  const groups: SuggestedGroup[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const { name, desc, nodes } = item as {
      name?: unknown;
      desc?: unknown;
      nodes?: unknown;
    };
    if (typeof name !== "string" || !Array.isArray(nodes)) {
      continue;
    }
    const nodeIds = nodes
      .map(n => indexToId[Number(n) - 1])
      .filter((id): id is string => typeof id === "string" && !claimed.has(id));
    if (nodeIds.length < 2) {
      continue;
    }
    nodeIds.forEach(id => claimed.add(id));
    groups.push({
      name: name.trim().slice(0, MAX_NAME_CHARS),
      desc: typeof desc === "string" ? desc.trim().slice(0, MAX_DESC_CHARS) : "",
      nodeIds,
    });
  }
  if (groups.length === 0) {
    throw new Error("AI grouping had no usable groups");
  }
  return groups;
}

// Like parseGroups, but each item is either an "into" reference to an existing
// region (by [R#] label) or a new-region spec. New regions still need ≥2 nodes;
// adding to an existing region can be a single node.
function parseAssignments(
  raw: string,
  indexToId: string[],
  regionByLabel: Map<string, string>,
): GroupAssignment[] {
  const cleaned = raw.replaceAll(/<think>[\s\S]*?<\/think>/giu, "");
  const match = cleaned.match(/\[[\s\S]*\]/u);
  if (!match) {
    throw new Error("AI returned no JSON array");
  }
  const parsed = JSON.parse(match[0]) as unknown;
  if (!Array.isArray(parsed)) {
    throw new TypeError("AI grouping is not an array");
  }

  const claimed = new Set<string>();
  const assignments: GroupAssignment[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const { into, name, desc, nodes } = item as {
      into?: unknown;
      name?: unknown;
      desc?: unknown;
      nodes?: unknown;
    };
    if (!Array.isArray(nodes)) {
      continue;
    }
    const nodeIds = nodes
      .map(n => indexToId[Number(n) - 1])
      .filter((id): id is string => typeof id === "string" && !claimed.has(id));
    if (nodeIds.length === 0) {
      continue;
    }

    const existingRegionId =
      typeof into === "string" ? regionByLabel.get(into.trim().toUpperCase()) : undefined;
    if (existingRegionId) {
      nodeIds.forEach(id => claimed.add(id));
      assignments.push({ existingRegionId, nodeIds });
      continue;
    }
    if (typeof name !== "string" || nodeIds.length < 2) {
      continue;
    }
    nodeIds.forEach(id => claimed.add(id));
    assignments.push({
      name: name.trim().slice(0, MAX_NAME_CHARS),
      desc: typeof desc === "string" ? desc.trim().slice(0, MAX_DESC_CHARS) : "",
      nodeIds,
    });
  }
  if (assignments.length === 0) {
    throw new Error("AI grouping had no usable assignments");
  }
  return assignments;
}

export function useAiGrouping() {
  const config = useAtomValue(configAtom);
  const results = useAtomValue(resultsAtom);

  // Number the (capped) nodes and turn them + their edges into prompt lines.
  const buildNodeContext = (nodes: AppNode[], edges: AppEdge[]) => {
    const scoped = nodes.slice(0, MAX_PROMPT_NODES);
    const indexToId = scoped.map(n => n.id);
    const indexById = new Map(scoped.map((n, i) => [n.id, i + 1]));

    const nodeLines = scoped.map((node, i) => {
      const entry = describeNode(node, results[node.id] ?? []);
      const label = entry?.label ?? node.type;
      const snippet = entry?.snippet.slice(0, MAX_SNIPPET_CHARS) ?? "";
      const pos = `[${Math.round(node.position.x)},${Math.round(node.position.y)}]`;
      return `[${i + 1}] ${node.type} ${pos} ${label}${snippet ? ` — ${snippet}` : ""}`;
    });

    const edgeLines = edges.flatMap(e => {
      const from = indexById.get(e.source);
      const to = indexById.get(e.target);
      return from && to ? [`${from}->${to}`] : [];
    });

    return { indexToId, nodeLines, edgeLines };
  };

  const runModel = (system: string, human: string) => {
    const model = new ChatOllama({
      model: config?.ai.ollama?.model,
      baseUrl: config?.ai.ollama?.url,
      streaming: false,
      numThread: 32,
      keepAlive: "10m",
      think: false,
    });
    return withTimeout(
      model.invoke([new SystemMessage(system), new HumanMessage(human)]),
      GROUPING_TIMEOUT_MS,
    );
  };

  // Ask the model to partition `nodes` (connected by `edges`) into fresh regions.
  const suggestGroups = async (nodes: AppNode[], edges: AppEdge[]): Promise<SuggestedGroup[]> => {
    const { indexToId, nodeLines, edgeLines } = buildNodeContext(nodes, edges);
    const human = [
      "Nodes:",
      ...nodeLines,
      "",
      "Edges:",
      edgeLines.length > 0 ? edgeLines.join(", ") : "(none)",
    ].join("\n");
    const response = await runModel(SYSTEM_PROMPT, human);
    return parseGroups(response.text, indexToId);
  };

  // Ask the model to slot each ungrouped node into an existing region or a new
  // one, given the current regions as [R#] anchors.
  const suggestAssignments = async (
    ungrouped: AppNode[],
    edges: AppEdge[],
    regions: RegionHint[],
  ): Promise<GroupAssignment[]> => {
    const { indexToId, nodeLines, edgeLines } = buildNodeContext(ungrouped, edges);
    const regionLines = regions.map(
      (r, i) => `[R${i + 1}] ${r.name}${r.desc ? ` — ${r.desc}` : ""}`,
    );
    const regionByLabel = new Map(regions.map((r, i) => [`R${i + 1}`, r.id]));

    const human = [
      "Existing regions:",
      regionLines.length > 0 ? regionLines.join("\n") : "(none)",
      "",
      "Ungrouped nodes:",
      ...nodeLines,
      "",
      "Edges:",
      edgeLines.length > 0 ? edgeLines.join(", ") : "(none)",
    ].join("\n");
    const response = await runModel(SYSTEM_PROMPT_ASSIGN, human);
    return parseAssignments(response.text, indexToId, regionByLabel);
  };

  return { suggestGroups, suggestAssignments };
}
