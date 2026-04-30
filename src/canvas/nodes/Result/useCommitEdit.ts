import { useCallback, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import type { AST } from "node-sql-parser";
import { schemaAtom, type DatabaseResult } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { resultsAtom } from "../../state";
import { collectVariablesFor, substituteVariables } from "../../variables";
import {
  buildPkAssignments,
  buildUpdateSql,
  formatSqlLiteral,
  getEditableTableName,
} from "./inlineEdit";

export type EditingState = {
  row: number;
  col: number;
  draft: string;
  error: string | null;
  saving: boolean;
};

export function useCommitEdit({
  editing,
  setEditing,
  data,
  query,
  ast,
  nodeId,
}: {
  editing: EditingState | null;
  setEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
  data: DatabaseResult;
  query: string;
  ast: AST;
  nodeId: string;
}) {
  const schema = useAtomValue(schemaAtom);
  const canvas = useCanvas();
  const setResults = useSetAtom(resultsAtom);
  const editableTable = useMemo(() => getEditableTableName(ast), [ast]);

  return useCallback(async () => {
    if (!editing) {
      return;
    }

    const setError = (error: string) =>
      setEditing(current => (current ? { ...current, error } : current));

    const { row, col, draft } = editing;
    const rowData = data[row];
    if (!rowData) {
      return;
    }
    const cell = rowData[col];
    if (!cell) {
      return;
    }
    const [columnName, , columnType] = cell;

    if (!editableTable) {
      setError("Cannot edit: query is not a single-table SELECT");
      return;
    }

    const pkColumns = schema.primaryKeys[editableTable] ?? [];
    if (pkColumns.length === 0) {
      setError(`Cannot edit: no primary key on "${editableTable}"`);
      return;
    }

    const pks = buildPkAssignments(rowData, pkColumns);
    if (!pks) {
      setError(`Row is missing primary key columns (${pkColumns.join(", ")})`);
      return;
    }

    let updateSql: string;
    try {
      const newLiteral = draft === "" ? "NULL" : formatSqlLiteral(draft, columnType);
      updateSql = buildUpdateSql(editableTable, columnName, newLiteral, pks);
    } catch (err) {
      setError(String(err));
      return;
    }

    const sourceQueryId = canvas.getEdges().find(edge => edge.target === nodeId)?.source;
    const vars = sourceQueryId ? collectVariablesFor(canvas, sourceQueryId) : {};

    let resolvedUpdateSql: string;
    let resolvedRefreshQuery: string;
    try {
      const update = substituteVariables(updateSql, vars);
      if (update.missing.length > 0) {
        throw new Error(`Undefined variables: ${update.missing.map(m => "@" + m).join(", ")}`);
      }
      const refresh = substituteVariables(query, vars);
      if (refresh.missing.length > 0) {
        throw new Error(`Undefined variables: ${refresh.missing.map(m => "@" + m).join(", ")}`);
      }
      resolvedUpdateSql = update.resolved;
      resolvedRefreshQuery = refresh.resolved;
    } catch (err) {
      setError(String(err));
      return;
    }

    setEditing(current => (current ? { ...current, saving: true, error: null } : current));
    try {
      await invoke("execute_statement", { query: resolvedUpdateSql });
      const refreshed = JSON.parse(
        (await invoke("get_results", { query: resolvedRefreshQuery })) as string,
      ) as DatabaseResult;
      setResults(prev => ({ ...prev, [nodeId]: refreshed }));
      setEditing(null);
    } catch (err) {
      setEditing(current =>
        current ? { ...current, saving: false, error: String(err) } : current,
      );
    }
  }, [
    editing,
    setEditing,
    data,
    editableTable,
    schema.primaryKeys,
    canvas,
    nodeId,
    query,
    setResults,
  ]);
}
