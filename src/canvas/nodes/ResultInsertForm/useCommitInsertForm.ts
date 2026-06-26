import { useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCanvas } from "../../hooks/useCanvas";
import { useExecuteQueries } from "../../hooks/useExecuteQueries";
import { ids } from "../../ids";
import type { ErrorData, QueryErrorNode } from "../../types";
import { substituteVariables, type VariableValue } from "../../variables";
import type { QueryInfo } from "../Result/queryInfo";
import {
  buildInsertSql,
  formatSqlLiteral,
  getEditableTableName,
  type InsertAssignment,
} from "../Result/cell/inlineEdit";

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

export const emptyInsertingState: InsertingState = {
  drafts: {},
  nullColumns: {},
  error: null,
  saving: false,
};

export function useCommitInsertForm({
  resultNodeId,
  queryInfo,
  columnTypes,
  variables,
  inserting,
  setInserting,
}: {
  resultNodeId: string;
  queryInfo: QueryInfo | null;
  columnTypes: Record<string, string>;
  variables: Record<string, VariableValue>;
  inserting: InsertingState;
  setInserting: React.Dispatch<React.SetStateAction<InsertingState>>;
}) {
  const canvas = useCanvas();
  const executeQueries = useExecuteQueries();
  const editableTable = useMemo(() => getEditableTableName(queryInfo), [queryInfo]);

  return useCallback(async () => {
    const setError = (error: string) => setInserting(current => ({ ...current, error }));

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
        const resolvedDraft = substituteVariables(draft, variables).resolved;
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

    setInserting(current => ({ ...current, saving: true, error: null }));
    try {
      await invoke("execute_statement", { query: insertSql });
    } catch (err) {
      const message = String(err);
      showInsertError(canvas, resultNodeId, insertSql, message);
      setInserting(current => ({ ...current, saving: false, error: message }));
      return;
    }

    const errorNodeId = ids.error(resultNodeId);
    if (canvas.getNode(errorNodeId)) {
      canvas.deleteNode(errorNodeId);
    }

    // Re-run the query node that feeds this result so the result and any
    // downstream nodes pick up the new row (only if it matches the filters).
    // Read the graph lazily here — subscribing would re-render on every drag.
    const nodes = canvas.getNodes();
    const edges = canvas.getEdges();
    const sourceEdge = edges.find(
      e => e.target === resultNodeId && nodes.find(n => n.id === e.source)?.type === "query",
    );
    const sourceQueryNode = sourceEdge ? nodes.find(n => n.id === sourceEdge.source) : undefined;
    if (sourceQueryNode && sourceQueryNode.type === "query") {
      executeQueries(sourceQueryNode, [sourceQueryNode.data.query]);
    }

    // Keep the form open for the next row, but clear what was just inserted.
    setInserting(emptyInsertingState);
  }, [
    editableTable,
    columnTypes,
    inserting,
    setInserting,
    canvas,
    resultNodeId,
    variables,
    executeQueries,
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
