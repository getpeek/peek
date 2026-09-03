import { useCallback, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { activeEngineAtom } from "../../../../Connection/engine";
import type { DatabaseResult } from "../../../../state";
import { copyRows } from "../export/copyRows";
import { exportRows } from "../export/exportRows";
import { getExportTableName } from "../cell/inlineEdit";
import type { QueryInfo } from "../queryInfo";
import type { ExportFormat } from "../export/serializeRows";
import { useCommitDelete } from "./useCommitDelete";

type DeleteConfirmState = {
  rowCount: number;
  table: string;
  saving: boolean;
  error: string | null;
};

export function useRowActions({
  data,
  query,
  queryInfo,
  nodeId,
  selected,
  cellGrid,
  closeCellMenu,
}: {
  data: DatabaseResult;
  query: string;
  queryInfo: QueryInfo | null;
  nodeId: string;
  selected: ReadonlySet<number>;
  /** The active cell-selection sub-grid, or null when no cell selection exists. */
  cellGrid: () => DatabaseResult | null;
  closeCellMenu: () => void;
}) {
  const commitDelete = useCommitDelete({ data, queryInfo, nodeId });
  const engine = useAtomValue(activeEngineAtom);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);

  const baseExportName = useMemo(() => {
    const trimmed =
      query
        .trim()
        .split("\n")[0]
        ?.replace(/^--\s*/u, "")
        .trim() ?? "";
    const safe = trimmed.replaceAll(/[^a-z0-9_-]+/giu, "_").replaceAll(/^_+|_+$/gu, "");
    return safe || "result";
  }, [query]);

  const exportTableName = getExportTableName(queryInfo, baseExportName);

  const selectedRows = useCallback((): DatabaseResult => {
    const indices = [...selected].toSorted((a, b) => a - b);
    return indices.map(i => data[i]).filter(Boolean) as DatabaseResult;
  }, [data, selected]);

  const exportSingleRow = useCallback(
    (rowIndex: number, format: ExportFormat) => {
      const row = data[rowIndex];
      if (!row) {
        return;
      }
      void exportRows({
        rows: [row],
        format,
        engine,
        defaultName: `${baseExportName}-row-${rowIndex + 1}`,
        tableName: exportTableName,
      });
    },
    [data, baseExportName, exportTableName, engine],
  );

  const exportSelectedRows = useCallback(
    (format: ExportFormat) => {
      const rows = selectedRows();
      if (rows.length === 0) {
        return;
      }
      void exportRows({
        rows,
        format,
        engine,
        defaultName: `${baseExportName}-${rows.length}-rows`,
        tableName: exportTableName,
      });
    },
    [baseExportName, exportTableName, selectedRows, engine],
  );

  const copyRow = useCallback(
    (rowIndex: number, format: ExportFormat) => {
      const row = data[rowIndex];
      if (!row) {
        return;
      }
      void copyRows({ rows: [row], format, engine, tableName: exportTableName });
    },
    [data, exportTableName, engine],
  );

  const copySelectedRows = useCallback(
    (format: ExportFormat) => {
      void copyRows({ rows: selectedRows(), format, engine, tableName: exportTableName });
    },
    [selectedRows, exportTableName, engine],
  );

  const copyCellSelection = useCallback(
    (format: ExportFormat) => {
      const grid = cellGrid();
      if (grid?.length) {
        void copyRows({ rows: grid, format, engine, tableName: exportTableName });
      }
    },
    [cellGrid, exportTableName, engine],
  );

  const exportCellSelection = useCallback(
    (format: ExportFormat) => {
      const grid = cellGrid();
      if (grid?.length) {
        const name = `${baseExportName}-selection-${grid.length}x${grid[0].length}`;
        void exportRows({
          rows: grid,
          format,
          engine,
          defaultName: name,
          tableName: exportTableName,
        });
      }
    },
    [cellGrid, baseExportName, exportTableName, engine],
  );

  const requestDelete = useCallback(() => {
    closeCellMenu();
    const check = commitDelete.preflight(selected);
    if (!check.ok) {
      setDeleteConfirm({ rowCount: selected.size, table: "", saving: false, error: check.reason });
      return;
    }
    setDeleteConfirm({
      rowCount: check.rowCount,
      table: check.table,
      saving: false,
      error: null,
    });
  }, [closeCellMenu, commitDelete, selected]);

  const cancelDelete = useCallback(() => {
    if (deleteConfirm?.saving) {
      return;
    }
    setDeleteConfirm(null);
  }, [deleteConfirm]);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) {
      return;
    }
    setDeleteConfirm({ ...deleteConfirm, saving: true, error: null });
    const result = await commitDelete.commit(selected);
    if (result.ok) {
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(prev =>
        prev ? { ...prev, saving: false, error: result.error ?? "Delete failed" } : prev,
      );
    }
  }, [deleteConfirm, commitDelete, selected]);

  return {
    deleteConfirm,
    exportSingleRow,
    exportSelectedRows,
    copyRow,
    copySelectedRows,
    copyCellSelection,
    exportCellSelection,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
