import { Menu, Table, Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { IconFileTypeCsv, IconJson } from "@tabler/icons-react";
import { AST, Parser } from "node-sql-parser";
import { toCsv } from "../../../tools/export/csv";
import { toJson } from "../../../tools/export/json";
import { schemaAtom, type DatabaseResult } from "../../../state";
import {
  getInboundReferences,
  getOutboundReferences,
  type CellReference,
} from "../../../shapes/Result/ResultTable/findReferences";
import { useCanvas } from "../../useCanvas";
import { useExecuteQueries } from "../../useExecuteQueries";
import { CellContextMenu } from "./CellContextMenu";
import { PortalAnchor } from "./PortalAnchor";
import { ResultTableHeader } from "./ResultTableHeader";
import { ResultTableRow } from "./ResultTableRow";
import { useCellContextMenu } from "./useCellContextMenu";
import { useColumnWidths } from "./useColumnWidths";
import { useCommitEdit, type EditingState } from "./useCommitEdit";
import type { Reference } from "./columnRoles";
import "../../../shapes/Result/ResultShape.css";

type HeaderMenuState = {
  x: number;
  y: number;
  columnIdx: number;
  header: string;
};

export function ResultTable({
  nodeId,
  data,
  query,
  columnWidths,
}: {
  nodeId: string;
  data: DatabaseResult;
  query: string;
  columnWidths?: Record<string, number>;
}) {
  const schema = useAtomValue(schemaAtom);
  const canvas = useCanvas();
  const executeQueries = useExecuteQueries();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [headerMenu, setHeaderMenu] = useState<HeaderMenuState | null>(null);
  const cellContextMenu = useCellContextMenu(nodeId);

  const firstRow = data[0] ?? [];
  const headers = firstRow.map(([key]) => key);
  const headerTypes = firstRow.map(([, , type]) => type);

  const { widthFor, totalWidth, startResize } = useColumnWidths({
    data,
    headers,
    columnWidths,
    nodeId,
    scrollContainerRef,
  });

  const ast = useMemo(() => {
    try {
      const parsed = new Parser().astify(query);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      return {} as AST;
    }
  }, [query]);

  const commitEdit = useCommitEdit({ editing, setEditing, data, query, ast, nodeId });

  const { outbound, inbound } = useMemo(() => {
    const outboundMap: Record<string, Reference[]> = {};
    const inboundMap: Record<string, Reference[]> = {};
    headers.forEach(column => {
      inboundMap[column] = getInboundReferences(ast, schema.references, column);
      outboundMap[column] = getOutboundReferences(ast, schema.references, column);
    });
    return { outbound: outboundMap, inbound: inboundMap };
  }, [headers, ast, schema.references]);

  const followReferences = (refs: CellReference[], value: unknown) => {
    const sourceNode = canvas.getNode(nodeId);
    if (!sourceNode) {
      return;
    }
    const queries = refs.map(
      ref => `SELECT * FROM ${ref.table} WHERE ${ref.column} = '${value}' LIMIT 300`,
    );
    executeQueries(sourceNode, queries);
  };

  const exportColumn = useCallback(
    async (columnIdx: number, header: string, format: "csv" | "json") => {
      const columnData: DatabaseResult = data
        .map(row => (row[columnIdx] ? [row[columnIdx]] : []))
        .filter(row => row.length > 0);
      if (columnData.length === 0) {
        return;
      }

      const path = await save({
        defaultPath: `${header}.${format}`,
        filters: [{ name: format.toUpperCase(), extensions: [format] }],
      });
      if (!path) {
        return;
      }

      const output =
        format === "csv" ? toCsv(columnData) : JSON.stringify(toJson(columnData), null, 2);
      await writeTextFile(path, output);
    },
    [data],
  );

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 8,
    estimateSize: () => 38,
  });

  if (data.length === 0) {
    return (
      <div className='no-results' style={{ padding: 16 }}>
        <Text c='var(--pk-fg-muted)'>No results</Text>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems.at(-1).end : 0;

  const closeHeaderMenu = () => setHeaderMenu(null);

  const openHeaderMenu = (e: React.MouseEvent, columnIdx: number, header: string) => {
    setHeaderMenu({ x: e.clientX, y: e.clientY, columnIdx, header });
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        overflow: "auto",
        position: "relative",
        background: "var(--pk-node-bg)",
      }}
      ref={scrollContainerRef}
    >
      <Table style={{ width: totalWidth, tableLayout: "fixed" }}>
        <colgroup>
          {headers.map((header, columnIdx) => (
            <col key={columnIdx} style={{ width: widthFor(header) }} />
          ))}
        </colgroup>
        <Table.Thead>
          <Table.Tr>
            {headers.map((header, columnIdx) => (
              <ResultTableHeader
                key={columnIdx}
                header={header}
                columnIdx={columnIdx}
                colType={headerTypes[columnIdx] || ""}
                inbound={inbound[header]}
                outbound={outbound[header]}
                onResizeStart={startResize}
                onContextMenu={openHeaderMenu}
              />
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td
                colSpan={headers.length}
                style={{ height: paddingTop, padding: 0, border: "none" }}
              />
            </tr>
          )}
          {virtualItems.map(virtualRow => (
            <ResultTableRow
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              row={data[virtualRow.index]}
              rowIndex={virtualRow.index}
              editing={editing}
              setEditing={setEditing}
              commitEdit={commitEdit}
              inbound={inbound}
              outbound={outbound}
              onFollowReferences={followReferences}
              onCellContextMenu={cellContextMenu.openCellMenu}
            />
          ))}
          {paddingBottom > 0 && (
            <tr>
              <td
                colSpan={headers.length}
                style={{ height: paddingBottom, padding: 0, border: "none" }}
              />
            </tr>
          )}
        </Table.Tbody>
      </Table>
      {headerMenu && (
        <Menu
          opened
          onClose={closeHeaderMenu}
          position='bottom-start'
          withinPortal
          width={220}
          offset={4}
          radius='md'
          classNames={{
            dropdown: "column-menu-dropdown",
            item: "column-menu-item",
            label: "column-menu-label",
            itemSection: "column-menu-item-section",
          }}
        >
          <Menu.Target>
            <PortalAnchor x={headerMenu.x} y={headerMenu.y} />
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{headerMenu.header}</Menu.Label>
            <Menu.Item
              leftSection={<IconFileTypeCsv size={14} />}
              onClick={() => {
                const { columnIdx, header } = headerMenu;
                closeHeaderMenu();
                exportColumn(columnIdx, header, "csv");
              }}
            >
              Export column as CSV
            </Menu.Item>
            <Menu.Item
              leftSection={<IconJson size={14} />}
              onClick={() => {
                const { columnIdx, header } = headerMenu;
                closeHeaderMenu();
                exportColumn(columnIdx, header, "json");
              }}
            >
              Export column as JSON
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
      <CellContextMenu
        cellMenu={cellContextMenu.cellMenu}
        onClose={cellContextMenu.closeCellMenu}
        onUseAsVariable={cellContextMenu.createVariableFromCell}
        onCopyValue={cellContextMenu.copyCellValue}
      />
    </div>
  );
}
