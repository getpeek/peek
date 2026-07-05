import { Table } from "@mantine/core";
import { memo } from "react";
import { classifyColumn, type Reference } from "./columnRoles";

export const ResultTableHeader = memo(function ResultTableHeader({
  header,
  columnIdx,
  colType,
  inbound,
  outbound,
  onResizeStart,
  onContextMenu,
  onSelectColumn,
  onHeaderEnter,
}: {
  header: string;
  columnIdx: number;
  colType: string;
  inbound: Reference[] | undefined;
  outbound: Reference[] | undefined;
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>, column: string) => void;
  onContextMenu: (e: React.MouseEvent, columnIdx: number, header: string) => void;
  onSelectColumn: (columnIdx: number) => void;
  onHeaderEnter: (columnIdx: number) => void;
}) {
  const { isPk, isFk } = classifyColumn(header, columnIdx, inbound, outbound);
  const headerClasses: string[] = [];
  if (isPk) {
    headerClasses.push("pk");
  } else if (isFk) {
    headerClasses.push("fk");
  }
  const upperType = colType.toUpperCase();

  return (
    <Table.Th
      className={headerClasses.join(" ")}
      onMouseEnter={() => onHeaderEnter(columnIdx)}
      onClick={e => {
        // Cmd/Ctrl lets the drag move the node instead of selecting the column.
        if (e.metaKey || e.ctrlKey) {
          return;
        }
        onSelectColumn(columnIdx);
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, columnIdx, header);
      }}
    >
      <div className='col-meta'>
        <span className='col-name'>
          {header}
          {isPk && <span className='col-tag pk'>PK</span>}
          {isFk && <span className='col-tag fk'>FK</span>}
        </span>
        {upperType && <span className='col-type'>{upperType}</span>}
      </div>
      <div
        className='col-resize-handle'
        onPointerDown={e => onResizeStart(e, header)}
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
      />
    </Table.Th>
  );
});
