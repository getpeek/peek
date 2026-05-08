import { useAtomValue } from "jotai";
import { edgesAtom, nodesAtom } from "../../state";
import { collectVariablesFromGraph, type VariableValue } from "../../variables";

export function useGetVariables(nodeId: string): Record<string, VariableValue> {
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  return collectVariablesFromGraph(nodes, edges, nodeId);
}
