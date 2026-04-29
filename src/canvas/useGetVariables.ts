import { useAtomValue } from "jotai";
import { edgesAtom, nodesAtom } from "./state";
import { collectVariablesFromGraph } from "./variables";

export function useGetVariables(nodeId: string): Record<string, string> {
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  return collectVariablesFromGraph(nodes, edges, nodeId);
}
