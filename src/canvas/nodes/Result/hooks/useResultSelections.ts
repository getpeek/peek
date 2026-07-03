import { useCellSelection } from "./useCellSelection";
import { useRowSelection } from "./useRowSelection";
import type { DatabaseResult } from "../../../../state";

/** Row and cell selection are mutually exclusive: starting either clears the other. */
export function useResultSelections(data: DatabaseResult, visibleIndices: number[]) {
  const rows = useRowSelection(data, visibleIndices);
  const cells = useCellSelection({ data, visibleIndices, onStart: rows.clear });

  const onRowSelectMouseDown = (rowIndex: number, e: React.MouseEvent) => {
    cells.clear();
    rows.onSelectMouseDown(rowIndex, e);
  };

  const clearAll = () => {
    rows.clear();
    cells.clear();
  };

  return { rows, cells, onRowSelectMouseDown, clearAll };
}
