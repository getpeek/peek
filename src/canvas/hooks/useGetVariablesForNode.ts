import { atom, useAtomValue } from "jotai";
import { atomFamily, selectAtom } from "jotai/utils";
import { edgesAtom, nodesAtom } from "../state";
import { collectVariablesFromGraph, type VariableValue } from "../variables";
import type { AppEdge, AppNode } from "../types";

// Two scopes are exposed:
//
//   * `direct` — only variables connected by an edge directly to this node.
//     Use this for anything the user authors *on* this node (drafts, autocomplete);
//     they explicitly attached the variable when they want it usable here.
//
//   * `inherited` — direct attachments plus variables on a connected query
//     (one hop). Use this when re-running the node's underlying query, since
//     that query was originally authored against the broader scope.
export type VariableScopes = {
  direct: Record<string, VariableValue>;
  inherited: Record<string, VariableValue>;
};

function computeScopes(nodes: AppNode[], edges: AppEdge[], nodeId: string): VariableScopes {
  const direct = collectVariablesFromGraph(nodes, edges, nodeId);
  const sourceQueryEdge = edges.find(
    e => e.target === nodeId && nodes.find(n => n.id === e.source)?.type === "query",
  );
  const queryVars = sourceQueryEdge
    ? collectVariablesFromGraph(nodes, edges, sourceQueryEdge.source)
    : {};
  return { direct, inherited: { ...queryVars, ...direct } };
}

function recordsEqual(a: Record<string, VariableValue>, b: Record<string, VariableValue>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  // Values are stable references while the variable nodes' data is untouched, so
  // a moved node (position-only change) compares equal and skips the re-render.
  return keys.every(key => Object.is(a[key], b[key]));
}

function scopesEqual(a: VariableScopes, b: VariableScopes): boolean {
  return recordsEqual(a.direct, b.direct) && recordsEqual(a.inherited, b.inherited);
}

const graphAtom = atom(get => ({ nodes: get(nodesAtom), edges: get(edgesAtom) }));

// Recomputing scopes on every graph change is cheap; the win is `scopesEqual`
// gating propagation so a node drag doesn't re-render every variable consumer.
const variableScopesAtom = atomFamily((nodeId: string) =>
  selectAtom(graphAtom, ({ nodes, edges }) => computeScopes(nodes, edges, nodeId), scopesEqual),
);

export function useGetVariablesForNode(nodeId: string): VariableScopes {
  return useAtomValue(variableScopesAtom(nodeId));
}
