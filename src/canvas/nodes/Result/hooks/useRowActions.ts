import { useCallback, useMemo, useState } from "react";
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
      void exportRows([row], format, `${baseExportName}-row-${rowIndex + 1}`, exportTableName);
    },
    [data, baseExportName, exportTableName],
  );

  const exportSelectedRows = useCallback(
    (format: ExportFormat) => {
      const rows = selectedRows();
      if (rows.length === 0) {
        return;
      }
      void exportRows(rows, format, `${baseExportName}-${rows.length}-rows`, exportTableName);
    },
    [baseExportName, exportTableName, selectedRows],
  );

  const copyRow = useCallback(
    (rowIndex: number, format: ExportFormat) => {
      const row = data[rowIndex];
      if (!row) {
        return;
      }
      void copyRows([row], format, exportTableName);
    },
    [data, exportTableName],
  );

  const copySelectedRows = useCallback(
    (format: ExportFormat) => {
      void copyRows(selectedRows(), format, exportTableName);
    },
    [selectedRows, exportTableName],
  );

  const copyCellSelection = useCallback(
    (format: ExportFormat) => {
      const grid = cellGrid();
      if (grid?.length) {
        void copyRows(grid, format, exportTableName);
      }
    },
    [cellGrid, exportTableName],
  );

  const exportCellSelection = useCallback(
    (format: ExportFormat) => {
      const grid = cellGrid();
      if (grid?.length) {
        const name = `${baseExportName}-selection-${grid.length}x${grid[0].length}`;
        void exportRows(grid, format, name, exportTableName);
      }
    },
    [cellGrid, baseExportName, exportTableName],
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
