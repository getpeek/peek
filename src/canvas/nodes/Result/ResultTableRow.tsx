import { Table } from "@mantine/core";
import { forwardRef } from "react";
import type { DatabaseResult } from "../../../state";
import type { CellReference } from "../../../shapes/Result/ResultTable/findReferences";
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
    editing: EditingState | null;
    setEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
    commitEdit: () => void;
    inbound: Record<string, Reference[]>;
    outbound: Record<string, Reference[]>;
    onFollowReferences: (refs: CellReference[], value: unknown) => void;
    onCellContextMenu: (e: React.MouseEvent, value: unknown, column: string) => void;
  }
>(function ResultTableRow(
  {
    row,
    rowIndex,
    editing,
    setEditing,
    commitEdit,
    inbound,
    outbound,
    onFollowReferences,
    onCellContextMenu,
  },
  ref,
) {
  const isEvenRow = rowIndex % 2 === 0;

  return (
    <Table.Tr ref={ref} data-index={rowIndex}>
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
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing({
                row: rowIndex,
                col: columnIdx,
                draft: stringifyValue(value),
                error: null,
                saving: false,
              });
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              onCellContextMenu(e, value, column);
            }}
          >
            {isEditing && editing ? (
              <EditCell
                type={type}
                draft={editing.draft}
                error={editing.error}
                saving={editing.saving}
                onChange={(next) =>
                  setEditing((current) => (current ? { ...current, draft: next } : current))
                }
                onCommit={commitEdit}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <DataCell
                value={value}
                type={type}
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
