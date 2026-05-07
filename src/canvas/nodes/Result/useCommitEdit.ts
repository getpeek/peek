import { useCallback, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { schemaAtom, type DatabaseResult } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { resultsAtom } from "../../state";
import { useGetVariablesForNode } from "../../hooks/useGetVariablesForNode";
import { substituteVariables } from "../../variables";
import type { QueryInfo } from "./queryInfo";
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
  queryInfo,
  nodeId,
}: {
  editing: EditingState | null;
  setEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
  data: DatabaseResult;
  query: string;
  queryInfo: QueryInfo | null;
  nodeId: string;
}) {
  const schema = useAtomValue(schemaAtom);
  const canvas = useCanvas();
  const setResults = useSetAtom(resultsAtom);
  const editableTable = useMemo(() => getEditableTableName(queryInfo), [queryInfo]);
  const vars = useGetVariablesForNode(nodeId);

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
      // Resolve the draft against connected variables before quoting; undefined
      // refs (e.g. typing `@test` with no `test` variable) stay as literal text.
      const resolvedDraft = substituteVariables(draft, vars.direct).resolved;
      const newLiteral =
        resolvedDraft === "" ? "NULL" : formatSqlLiteral(resolvedDraft, columnType);
      updateSql = buildUpdateSql(editableTable, columnName, newLiteral, pks);
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

    setEditing(current => (current ? { ...current, saving: true, error: null } : current));
    try {
      await invoke("execute_statement", { query: updateSql });
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
    vars,
  ]);
}
