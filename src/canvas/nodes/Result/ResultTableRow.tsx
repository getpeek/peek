import { Table } from "@mantine/core";
import { forwardRef } from "react";
import type { DatabaseResult } from "../../../state";
import type { CellReference } from "./findReferences";
import { DataCell } from "./Cell";
import { EditCell } from "./EditCell";
import { classifyColumn, type Reference } from "./columnRoles";
import { stringifyValue } from "./stringify";
import type { EditingState } from "./useCommitEdit";

type RowData = DatabaseResult[number];

export const ResultTableRow = forwardRef<
  HTMLTableRowElement,
  {
    row: RowData;
    rowIndex: number;
    /** Position in the (possibly filtered) virtual list — drives `data-index` and striping. */
    virtualIndex: number;
    editing: EditingState | null;
    setEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
    commitEdit: () => void;
    variableNames: string[];
    inbound: Record<string, Reference[]>;
    outbound: Record<string, Reference[]>;
    isSelected: boolean;
    matchedCols?: Set<number>;
    onSelectMouseDown: (rowIndex: number, e: React.MouseEvent) => void;
    onFollowReferences: (refs: CellReference[], value: unknown) => void;
    onCellContextMenu: (
      e: React.MouseEvent,
      value: unknown,
      column: string,
      rowIndex: number,
    ) => void;
  }
>(function ResultTableRow(
  {
    row,
    rowIndex,
    virtualIndex,
    editing,
    setEditing,
    commitEdit,
    variableNames,
    inbound,
    outbound,
    isSelected,
    matchedCols,
    onSelectMouseDown,
    onFollowReferences,
    onCellContextMenu,
  },
  ref,
) {
  const isEvenRow = virtualIndex % 2 === 0;
  const rowClasses: string[] = [];
  if (isSelected) {
    rowClasses.push("selected");
  }

  return (
    <Table.Tr
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
        const isEditing = editing?.row === rowIndex && editing?.col === columnIdx;

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
        if (isEditing && editing?.error) {
          cellClasses.push("error");
        }

        return (
          <Table.Td
            key={columnIdx}
            className={cellClasses.join(" ")}
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
              onCellContextMenu(e, value, column, rowIndex);
            }}
          >
            {isEditing && editing ? (
              <EditCell
                type={type}
                draft={editing.draft}
                error={editing.error}
                saving={editing.saving}
                variableNames={variableNames}
                onChange={next =>
                  setEditing(current => (current ? { ...current, draft: next } : current))
                }
                onCommit={commitEdit}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <DataCell
                value={value}
                type={type}
                isKey={isPk || isFk}
                outbound={outbound[column]}
                inbound={inbound[column]}
                onInboundClick={onFollowReferences}
                onOutboundClick={onFollowReferences}
              />
            )}
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
});
