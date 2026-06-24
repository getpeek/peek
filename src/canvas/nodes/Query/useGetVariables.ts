import { useGetVariablesForNode } from "../../hooks/useGetVariablesForNode";
import type { VariableValue } from "../../variables";

// Directly-attached variables for this node. Delegates to the shared, value-
// stabilized scope hook (selectAtom + equality) so query nodes DON'T re-render
// on every node-drag frame — a position-only graph change compares equal and is
// skipped. Reading nodes/edges directly here (the old impl) re-rendered every
// query node 60×/sec while any node was dragged.
export function useGetVariables(nodeId: string): Record<string, VariableValue> {
  return useGetVariablesForNode(nodeId).direct;
}
