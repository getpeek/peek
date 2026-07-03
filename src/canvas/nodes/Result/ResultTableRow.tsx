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
  rowBandEdges,
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
  /** Which sides of a row-selection band this row is on — non-null only when row-selected. */
  rowBandEdges: { top: boolean; bottom: boolean } | null;
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
        if (e.shiftKey) {
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
          if (virtualIndex === cellRect.top) {
            cellClasses.push("sel-top");
          }
          if (virtualIndex === cellRect.bottom) {
            cellClasses.push("sel-bottom");
          }
          if (columnIdx === cellRect.left) {
            cellClasses.push("sel-left");
          }
          if (columnIdx === cellRect.right) {
            cellClasses.push("sel-right");
          }
        }
        // Row-band selection spans the full width; `tr.selected` carries the fill,
        // these classes draw the band's rounded outline on its boundary cells.
        if (rowBandEdges) {
          if (rowBandEdges.top) {
            cellClasses.push("sel-top");
          }
          if (rowBandEdges.bottom) {
            cellClasses.push("sel-bottom");
          }
          if (columnIdx === 0) {
            cellClasses.push("sel-left");
          }
          if (columnIdx === row.length - 1) {
            cellClasses.push("sel-right");
          }
        }

        return (
          <td
            key={columnIdx}
            data-col={columnIdx}
            className={cellClasses.join(" ")}
            onMouseDown={e => {
              // Shift is row selection (handled by the row); editing keeps native
              // text selection; a reference chip click should navigate, not select.
              if (e.shiftKey || isEditing) {
                return;
              }
              if ((e.target as HTMLElement).closest(".reference--link")) {
                return;
              }
              onCellSelectMouseDown(virtualIndex, columnIdx, e);
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
