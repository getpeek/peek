import { useState } from "react";
import type { DatabaseResult } from "../../../../state";
import { useGetVariablesForNode } from "../../../hooks/useGetVariablesForNode";
import type { QueryInfo } from "../queryInfo";
import { useCommitEdit, type EditingState } from "./useCommitEdit";

/** Inline-edit state shared by the table and pivot views. EditingState is keyed
 *  by `{ row, col }` indices into the result, so it is layout-agnostic. */
export function useResultEditing({
  data,
  query,
  queryInfo,
  nodeId,
}: {
  data: DatabaseResult;
  query: string;
  queryInfo: QueryInfo | null;
  nodeId: string;
}) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const commitEdit = useCommitEdit({ editing, setEditing, data, query, queryInfo, nodeId });
  const variableNames = Object.keys(useGetVariablesForNode(nodeId).direct).toSorted();

  return { editing, setEditing, commitEdit, variableNames };
}
