import { memo } from "react";
import type { DatabaseResult } from "../../../state";
import type { CellReference } from "./findReferences";
import { DataCell } from "./cell/Cell";
import { EditCell } from "./cell/EditCell";
import { classifyColumn, type Reference } from "./columnRoles";
import { stringifyValue } from "./stringify";
import type { CellRect } from "./hooks/useCellSelection";
import type { EditingState } from "./hooks/useCommitEdit";
import type { CellMenuTarget } from "./hooks/useCellContextMenu";

type RowData = DatabaseResult[number];

/**
 * Edit-cell props travel together and only reach the row currently being edited.
 * Keeping them off every other row means a keystroke — or any unrelated
 * re-render of the table — never invalidates the memoized non-editing rows.
 */
export type RowEdit = {
  editing: EditingState;
  commitEdit: () => void;
  variableNames: string[];
};

export const ResultTableRow = memo(function ResultTableRow({
  ref,
  row,
  rowIndex,
  virtualIndex,
  edit,
  setEditing,
  inbound,
  outbound,
  isSelected,
  cellRect,
  matchedCols,
  onSelectMouseDown,
  onCellSelectMouseDown,
  onFollowReferences,
  onCellContextMenu,
}: {
  /** The virtualizer's `measureElement` callback ref — attaches to the row for height measurement. */
  ref?: React.Ref<HTMLTableRowElement>;
  row: RowData;
  rowIndex: number;
  /** Position in the (possibly filtered) virtual list — drives `data-index` and striping. */
  virtualIndex: number;
  edit: RowEdit | null;
  setEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
  inbound: Record<string, Reference[]>;
  outbound: Record<string, Reference[]>;
  isSelected: boolean;
  /** The active cell-selection rect — non-null only when this row is inside it. */
  cellRect: CellRect | null;
  matchedCols?: Map<number, Fuzzysort.Result>;
  onSelectMouseDown: (rowIndex: number, e: React.MouseEvent) => void;
  onCellSelectMouseDown: (displayPos: number, colIdx: number, e: React.MouseEvent) => void;
  onFollowReferences: (refs: CellReference[], value: unknown) => void;
  onCellContextMenu: (e: React.MouseEvent, cell: CellMenuTarget) => void;
}) {
  const isEvenRow = virtualIndex % 2 === 0;
  const rowClasses: string[] = [];
  if (isSelected) {
    rowClasses.push("selected");
  }

  return (
    <tr
      ref={ref}
      data-index={virtualIndex}
      className={rowClasses.join(" ") || undefined}
      onMouseDown={e => {
        if (e.altKey && !e.shiftKey) {
          onSelectMouseDown(rowIndex, e);
        }
      }}
    >
      {row.map(([column, value, type], columnIdx) => {
        const { isPk, isFk } = classifyColumn(column, columnIdx, inbound[column], outbound[column]);
        const isEditing = edit?.editing.col === columnIdx;

        const cellClasses: string[] = ["editable"];
        if (isPk) {
          cellClasses.push("pk");
        } else if (isFk) {
          cellClasses.push("fk");
        }
        if (isEvenRow) {
          cellClasses.push("even");
        }
        if (matchedCols?.has(columnIdx)) {
          cellClasses.push("search-match");
        }
        if (isEditing) {
          cellClasses.push("editing");
        }
        if (isEditing && edit?.editing.error) {
          cellClasses.push("error");
        }
        if (cellRect && columnIdx >= cellRect.left && columnIdx <= cellRect.right) {
          cellClasses.push("cell-selected");
        }

        return (
          <td
            key={columnIdx}
            data-col={columnIdx}
            className={cellClasses.join(" ")}
            onMouseDown={e => {
              if (e.shiftKey && !isEditing) {
                onCellSelectMouseDown(virtualIndex, columnIdx, e);
              }
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              setEditing({
                row: rowIndex,
                col: columnIdx,
                draft: stringifyValue(value),
                error: null,
                saving: false,
              });
            }}
            onContextMenu={e => {
              e.stopPropagation();
              onCellContextMenu(e, {
                value,
                column,
                rowIndex,
                columnIdx,
                displayPos: virtualIndex,
              });
            }}
          >
            {isEditing && edit ? (
              <EditCell
                type={type}
                draft={edit.editing.draft}
                error={edit.editing.error}
                saving={edit.editing.saving}
                variableNames={edit.variableNames}
                onChange={next =>
                  setEditing(current => (current ? { ...current, draft: next } : current))
                }
                onCommit={edit.commitEdit}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <DataCell
                value={value}
                type={type}
                isKey={isPk || isFk}
                match={matchedCols?.get(columnIdx)}
                outbound={outbound[column]}
                inbound={inbound[column]}
                onInboundClick={onFollowReferences}
                onOutboundClick={onFollowReferences}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
});
