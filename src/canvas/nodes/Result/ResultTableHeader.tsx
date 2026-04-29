import { Table } from "@mantine/core";
import { classifyColumn, type Reference } from "./columnRoles";

export function ResultTableHeader({
  header,
  columnIdx,
  colType,
  inbound,
  outbound,
  onResizeStart,
  onContextMenu,
}: {
  header: string;
  columnIdx: number;
  colType: string;
  inbound: Reference[] | undefined;
  outbound: Reference[] | undefined;
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>, column: string) => void;
  onContextMenu: (e: React.MouseEvent, columnIdx: number, header: string) => void;
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
}
