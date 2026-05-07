import { useCallback, useMemo, useState } from "react";
import type { DatabaseResult } from "../../../state";
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
        ?.replace(/^--\s*/, "")
        .trim() ?? "";
    const safe = trimmed.replaceAll(/[^a-z0-9_-]+/gi, "_").replaceAll(/^_+|_+$/g, "");
    return safe || "result";
  }, [query]);

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
      const indices = [...selected].toSorted((a, b) => a - b);
      const rows = indices.map(i => data[i]).filter(Boolean) as DatabaseResult;
      if (rows.length === 0) {
        return;
      }
      void exportRows(rows, format, `${baseExportName}-${rows.length}-rows`);
    },
    [data, baseExportName, selected],
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
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
