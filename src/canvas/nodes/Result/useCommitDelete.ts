import { useCallback, useMemo } from "react";
import { useAtomValue } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import type { AST } from "node-sql-parser";
import { schemaAtom } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { useExecuteQueries } from "../../hooks/useExecuteQueries";
import { ids } from "../../ids";
import { edgesAtom, nodesAtom } from "../../state";
import type { AppNode, ErrorData, QueryErrorNode } from "../../types";
import {
  buildDeleteSql,
  buildPkAssignments,
  getEditableTableName,
  type PkAssignment,
} from "./inlineEdit";
import type { DatabaseResult } from "../../../state";

const ERROR_NODE_WIDTH = 400;
const ERROR_NODE_HEIGHT = 300;
const ERROR_NODE_GAP = 50;
const DEFAULT_RESULT_HEIGHT = 600;

export type DeletePreflight =
  | { ok: true; table: string; rowCount: number }
  | { ok: false; reason: string };

export function useCommitDelete({
  data,
  ast,
  nodeId,
}: {
  data: DatabaseResult;
  ast: AST;
  nodeId: string;
}) {
  const schema = useAtomValue(schemaAtom);
  const canvas = useCanvas();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const executeQueries = useExecuteQueries();
  const editableTable = useMemo(() => getEditableTableName(ast), [ast]);

  const sourceQueryNode = useMemo<AppNode | null>(() => {
    const edge = edges.find(
      e => e.target === nodeId && nodes.find(n => n.id === e.source)?.type === "query",
    );
    if (!edge) {
      return null;
    }
    return nodes.find(n => n.id === edge.source) ?? null;
  }, [edges, nodes, nodeId]);

  const preflight = useCallback(
    (selected: ReadonlySet<number>): DeletePreflight => {
      if (selected.size === 0) {
        return { ok: false, reason: "No rows selected" };
      }
      if (!editableTable) {
        return { ok: false, reason: "Cannot delete: query is not a single-table SELECT" };
      }
      const pkColumns = schema.primaryKeys[editableTable] ?? [];
      if (pkColumns.length === 0) {
        return { ok: false, reason: `Cannot delete: no primary key on "${editableTable}"` };
      }
      return { ok: true, table: editableTable, rowCount: selected.size };
    },
    [editableTable, schema.primaryKeys],
  );

  const commit = useCallback(
    async (selected: ReadonlySet<number>): Promise<{ ok: boolean; error?: string }> => {
      const check = preflight(selected);
      if (!check.ok) {
        return { ok: false, error: check.reason };
      }

      const pkColumns = schema.primaryKeys[check.table] ?? [];
      const rowAssignments: PkAssignment[][] = [];
      for (const idx of selected) {
        const rowData = data[idx];
        if (!rowData) {
          return { ok: false, error: `Row ${idx} no longer exists` };
        }
        const pks = buildPkAssignments(rowData, pkColumns);
        if (!pks) {
          return {
            ok: false,
            error: `Row ${idx} is missing primary key columns (${pkColumns.join(", ")})`,
          };
        }
        rowAssignments.push(pks);
      }

      let deleteSql: string;
      try {
        deleteSql = buildDeleteSql(check.table, pkColumns, rowAssignments);
      } catch (err) {
        return { ok: false, error: String(err) };
      }

      try {
        await invoke("execute_statement", { query: deleteSql });
      } catch (err) {
        const message = String(err);
        showDeleteError(canvas, nodeId, deleteSql, message);
        return { ok: false, error: message };
      }

      const errorNodeId = ids.error(nodeId);
      if (canvas.getNode(errorNodeId)) {
        canvas.deleteNode(errorNodeId);
      }

      // Re-run the source query node so the result node and any downstream
      // nodes (charts, dependent queries) all see the updated rows.
      if (sourceQueryNode && sourceQueryNode.type === "query") {
        executeQueries(sourceQueryNode, [sourceQueryNode.data.query]);
      }

      return { ok: true };
    },
    [preflight, schema.primaryKeys, data, canvas, nodeId, sourceQueryNode, executeQueries],
  );

  return { preflight, commit };
}

function showDeleteError(
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
