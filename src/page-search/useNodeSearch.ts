import fuzzysort from "fuzzysort";
import { useAtomValue } from "jotai";
import { nodesAtom, resultsAtom } from "../canvas/state";
import { describeNode, type NodeSearchEntry } from "./searchCorpus";

export interface NodeSearchResult {
  entry: NodeSearchEntry;
  labelHighlight?: Fuzzysort.Result;
}

export const useNodeSearch = (query: string): NodeSearchResult[] => {
  const nodes = useAtomValue(nodesAtom);
  const results = useAtomValue(resultsAtom);

  if (query.trim().length === 0) {
    return [];
  }

  const entries = nodes
    .map(node => describeNode(node, results[node.id] ?? []))
    .filter((entry): entry is NodeSearchEntry => entry !== null);

  return fuzzysort
    .go(query, entries, { keys: ["titleMatch", "haystack"] })
    .map(result => ({ entry: result.obj, labelHighlight: result[0] ?? undefined }));
};
