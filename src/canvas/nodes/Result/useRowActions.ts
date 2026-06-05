import { useCallback, useMemo, useState } from "react";
import type { DatabaseResult } from "../../../state";
import { copyRows } from "./copyRows";
import { exportRows } from "./exportRows";
import type { QueryInfo } from "./queryInfo";
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
  closeCellMenu,
}: {
  data: DatabaseResult;
  query: string;
  queryInfo: QueryInfo | null;
  nodeId: string;
  selected: ReadonlySet<number>;
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

  const selectedRows = useCallback((): DatabaseResult => {
    const indices = [...selected].toSorted((a, b) => a - b);
    return indices.map(i => data[i]).filter(Boolean) as DatabaseResult;
  }, [data, selected]);

  const exportSingleRow = useCallback(
    (rowIndex: number, format: "csv" | "json") => {
      const row = data[rowIndex];
      if (!row) {
        return;
      }
      void exportRows([row], format, `${baseExportName}-row-${rowIndex + 1}`);
    },
    [data, baseExportName],
  );

  const exportSelectedRows = useCallback(
    (format: "csv" | "json") => {
      const rows = selectedRows();
      if (rows.length === 0) {
        return;
      }
      void exportRows(rows, format, `${baseExportName}-${rows.length}-rows`);
    },
    [baseExportName, selectedRows],
  );

  const copyRow = useCallback(
    (rowIndex: number, format: "csv" | "json") => {
      const row = data[rowIndex];
      if (!row) {
        return;
      }
      void copyRows([row], format);
    },
    [data],
  );

  const copySelectedRows = useCallback(
    (format: "csv" | "json") => {
      void copyRows(selectedRows(), format);
    },
    [selectedRows],
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
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
