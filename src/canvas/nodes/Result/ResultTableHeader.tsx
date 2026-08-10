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
  onHeaderMouseDown,
  onHeaderEnter,
}: {
  header: string;
  columnIdx: number;
  colType: string;
  inbound: Reference[] | undefined;
  outbound: Reference[] | undefined;
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>, column: string) => void;
  onContextMenu: (e: React.MouseEvent, columnIdx: number, header: string) => void;
  onHeaderMouseDown: (columnIdx: number, e: React.MouseEvent) => void;
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
      data-col={columnIdx}
      onMouseEnter={() => onHeaderEnter(columnIdx)}
      onMouseDown={e => onHeaderMouseDown(columnIdx, e)}
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
        // stopPropagation on the pointerdown above doesn't stop the mousedown
        // that follows it, so the resize would also start a column selection.
        onMouseDown={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
      />
    </Table.Th>
  );
});
