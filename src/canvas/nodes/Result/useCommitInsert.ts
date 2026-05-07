import { useCallback, useMemo } from "react";
import { useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import type { DatabaseResult } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { useGetVariablesForNode } from "../../hooks/useGetVariablesForNode";
import { ids } from "../../ids";
import { resultsAtom } from "../../state";
import type { ErrorData, QueryErrorNode } from "../../types";
import { substituteVariables } from "../../variables";
import type { QueryInfo } from "./queryInfo";
import {
  buildInsertSql,
  formatSqlLiteral,
  getEditableTableName,
  type InsertAssignment,
} from "./inlineEdit";

const ERROR_NODE_WIDTH = 400;
const ERROR_NODE_HEIGHT = 300;
const ERROR_NODE_GAP = 50;
const DEFAULT_RESULT_HEIGHT = 600;

export type InsertingState = {
  drafts: Record<string, string>;
  nullColumns: Record<string, true>;
  error: string | null;
  saving: boolean;
};

export function useCommitInsert({
  inserting,
  setInserting,
  query,
  queryInfo,
  nodeId,
  columnTypes,
}: {
  inserting: InsertingState | null;
  setInserting: React.Dispatch<React.SetStateAction<InsertingState | null>>;
  query: string;
  queryInfo: QueryInfo | null;
  nodeId: string;
  columnTypes: Record<string, string>;
}) {
  const canvas = useCanvas();
  const setResults = useSetAtom(resultsAtom);
  const editableTable = useMemo(() => getEditableTableName(queryInfo), [queryInfo]);
  const vars = useGetVariablesForNode(nodeId);

  return useCallback(async () => {
    if (!inserting) {
      return;
    }

    const setError = (error: string) =>
      setInserting(current => (current ? { ...current, error } : current));

    if (!editableTable) {
      setError("Cannot insert: query is not a single-table SELECT");
      return;
    }

    const assignments: InsertAssignment[] = [];
    try {
      for (const column of Object.keys(columnTypes)) {
        if (inserting.nullColumns[column]) {
          assignments.push({ column, literal: "NULL" });
          continue;
        }
        const draft = inserting.drafts[column] ?? "";
        if (draft === "") {
          continue;
        }
        // Resolve the draft against connected variables before quoting; undefined
        // refs (e.g. typing `@test` with no `test` variable) stay as literal text.
        const resolvedDraft = substituteVariables(draft, vars.direct).resolved;
        const type = columnTypes[column] ?? "";
        assignments.push({ column, literal: formatSqlLiteral(resolvedDraft, type) });
      }
    } catch (err) {
      setError(String(err));
      return;
    }

    if (assignments.length === 0) {
      setError("Provide at least one value to insert");
      return;
    }

    let insertSql: string;
    try {
      insertSql = buildInsertSql(editableTable, assignments);
    } catch (err) {
      setError(String(err));
      return;
    }

    let resolvedRefreshQuery: string;
    try {
      const refresh = substituteVariables(query, vars.inherited);
      if (refresh.missing.length > 0) {
        throw new Error(`Undefined variables: ${refresh.missing.map(m => "@" + m).join(", ")}`);
      }
      resolvedRefreshQuery = refresh.resolved;
    } catch (err) {
      setError(String(err));
      return;
    }

    setInserting(current => (current ? { ...current, saving: true, error: null } : current));
    try {
      await invoke("execute_statement", { query: insertSql });
      const refreshed = JSON.parse(
        (await invoke("get_results", { query: resolvedRefreshQuery })) as string,
      ) as DatabaseResult;
      setResults(prev => ({ ...prev, [nodeId]: refreshed }));
      const errorNodeId = ids.error(nodeId);
      if (canvas.getNode(errorNodeId)) {
        canvas.deleteNode(errorNodeId);
      }
      setInserting(null);
    } catch (err) {
      const message = String(err);
      showInsertError(canvas, nodeId, insertSql, message);
      setInserting(current => (current ? { ...current, saving: false, error: message } : current));
    }
  }, [
    inserting,
    setInserting,
    editableTable,
    columnTypes,
    canvas,
    nodeId,
    query,
    setResults,
    vars,
  ]);
}

function showInsertError(
  canvas: ReturnType<typeof useCanvas>,
  resultNodeId: string,
  failedSql: string,
  message: string,
): void {
  const errorNodeId = ids.error(resultNodeId);
  const errorData: ErrorData = { queryNodeId: "", query: failedSql, message };
  const existing = canvas.getNode(errorNodeId);
  if (existing) {
    canvas.updateNode(errorNodeId, n => ({ ...n, data: errorData }) as QueryErrorNode);
    return;
  }
  const resultNode = canvas.getNode(resultNodeId);
  if (!resultNode) {
    return;
  }
  const errorY =
    resultNode.position.y + (resultNode.height ?? DEFAULT_RESULT_HEIGHT) + ERROR_NODE_GAP;
  const node: QueryErrorNode = {
    id: errorNodeId,
    type: "query-error",
    position: { x: resultNode.position.x, y: errorY },
    width: ERROR_NODE_WIDTH,
    height: ERROR_NODE_HEIGHT,
    data: errorData,
  };
  canvas.addNode(node);
  canvas.connect(errorNodeId, resultNodeId);
}
