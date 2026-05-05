import { useAtomValue } from "jotai";
import { edgesAtom, nodesAtom } from "../state";
import { collectVariablesFromGraph } from "../variables";

// Two scopes are exposed:
//
//   * `direct` — only variables connected by an edge directly to this node.
//     Use this for anything the user authors *on* this node (drafts, autocomplete);
//     they explicitly attached the variable when they want it usable here.
//
//   * `inherited` — direct attachments plus variables on a connected query
//     (one hop). Use this when re-running the node's underlying query, since
//     that query was originally authored against the broader scope.
export function useGetVariablesForNode(nodeId: string): {
  direct: Record<string, string>;
  inherited: Record<string, string>;
} {
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const direct = collectVariablesFromGraph(nodes, edges, nodeId);
  const sourceQueryEdge = edges.find(
    e => e.target === nodeId && nodes.find(n => n.id === e.source)?.type === "query",
  );
  const queryVars = sourceQueryEdge
    ? collectVariablesFromGraph(nodes, edges, sourceQueryEdge.source)
    : {};
  return {
    direct,
    inherited: { ...queryVars, ...direct },
  };
}
