import { useCallback } from "react";
import { exportRows } from "../export/exportRows";
import { getExportTableName } from "../cell/inlineEdit";
import { useColumnAsVariable } from "./useColumnAsVariable";
import type { CellRect } from "./useCellSelection";
import type { ExportFormat } from "../export/serializeRows";
import type { QueryInfo } from "../queryInfo";
import type { DatabaseResult } from "../../../../state";

/** Column-scoped actions: header-menu export/variable plus selection-as-variable. */
export function useColumnActions({
  nodeId,
  data,
  headers,
  headerTypes,
  queryInfo,
  cellRect,
  selectedRowIndices,
  closeCellMenu,
}: {
  nodeId: string;
  data: DatabaseResult;
  headers: string[];
  headerTypes: string[];
  queryInfo: QueryInfo | null;
  cellRect: CellRect | null;
  selectedRowIndices: () => number[];
  closeCellMenu: () => void;
}) {
  const exportColumn = useCallback(
    async (columnIdx: number, header: string, format: ExportFormat) => {
      const columnData: DatabaseResult = data
        .map(row => (row[columnIdx] ? [row[columnIdx]] : []))
        .filter(row => row.length > 0);
      if (columnData.length === 0) {
        return;
      }
      await exportRows(columnData, format, header, getExportTableName(queryInfo, header));
    },
    [data, queryInfo],
  );

  const spawnVariableFromColumn = useColumnAsVariable({ nodeId, data, headerTypes });

  const spawnVariableFromSelection = () => {
    closeCellMenu();
    if (cellRect && cellRect.left === cellRect.right) {
      spawnVariableFromColumn(cellRect.left, headers[cellRect.left], selectedRowIndices());
    }
  };

  return { exportColumn, spawnVariableFromColumn, spawnVariableFromSelection };
}
