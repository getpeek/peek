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

export type SuggestedGroup = { name: string; desc: string; nodeIds: string[] };

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

export function useAiGrouping() {
  const config = useAtomValue(configAtom);
  const results = useAtomValue(resultsAtom);

  // Ask the model to partition `nodes` (connected by `edges`) into regions.
  const suggestGroups = async (nodes: AppNode[], edges: AppEdge[]): Promise<SuggestedGroup[]> => {
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

    const model = new ChatOllama({
      model: config?.ai.model,
      baseUrl: config?.ai.url,
      streaming: false,
      numThread: 32,
      keepAlive: "10m",
      think: false,
    });

    const human = [
      "Nodes:",
      ...nodeLines,
      "",
      "Edges:",
      edgeLines.length > 0 ? edgeLines.join(", ") : "(none)",
    ].join("\n");

    const response = await withTimeout(
      model.invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(human)]),
      GROUPING_TIMEOUT_MS,
    );
    return parseGroups(response.text, indexToId);
  };

  return { suggestGroups };
}
