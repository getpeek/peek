import { Table, Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { schemaAtom, type DatabaseResult } from "../../../state";
import {
  getInboundReferences,
  getOutboundReferences,
  type CellReference,
} from "../../../shapes/Result/ResultTable/findReferences";
import { useCanvas } from "../../hooks/useCanvas";
import { useExecuteQueries } from "../../hooks/useExecuteQueries";
import { CellContextMenu } from "./CellContextMenu";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { exportRows } from "./exportRows";
import { InsertRow } from "./InsertRow";
import { ResultHeaderMenu, type HeaderMenuState } from "./ResultHeaderMenu";
import { ResultTableHeader } from "./ResultTableHeader";
import { ResultTableRow } from "./ResultTableRow";
import { useCellContextMenu } from "./useCellContextMenu";
import { useColumnAsVariable } from "./useColumnAsVariable";
import { useColumnWidths } from "./useColumnWidths";
import { useCommitEdit, type EditingState } from "./useCommitEdit";
import { useCommitInsert, type InsertingState } from "./useCommitInsert";
import type { QueryInfo } from "./queryInfo";
import type { ExportFormat } from "./serializeRows";
import { useRowActions } from "./useRowActions";
import { useRowSelection } from "./useRowSelection";
import { useGetVariablesForNode } from "../../hooks/useGetVariablesForNode";
import type { Reference } from "./columnRoles";
import { getEditableTableName, getExportTableName } from "./inlineEdit";
import "../../../shapes/Result/ResultShape.css";

export function ResultTable({
  nodeId,
  data,
  query,
  queryInfo,
  columnWidths,
}: {
  nodeId: string;
  data: DatabaseResult;
  query: string;
  queryInfo: QueryInfo | null;
  columnWidths?: Record<string, number>;
}) {
  const schema = useAtomValue(schemaAtom);
  const canvas = useCanvas();
  const executeQueries = useExecuteQueries();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [inserting, setInserting] = useState<InsertingState | null>(null);
  const [headerMenu, setHeaderMenu] = useState<HeaderMenuState | null>(null);
  const cellContextMenu = useCellContextMenu(nodeId);
  const rowSelection = useRowSelection(data);

  const firstRow = data[0] ?? [];
  const headers = firstRow.map(([key]) => key);
  const headerTypes = firstRow.map(([, , type]) => type);
  const columnTypes: Record<string, string> = {};
  headers.forEach((header, idx) => {
    columnTypes[header] = headerTypes[idx] ?? "";
  });

  const { widthFor, totalWidth, startResize } = useColumnWidths({
    data,
    headers,
    columnWidths,
    nodeId,
    scrollContainerRef,
  });

  const commitEdit = useCommitEdit({ editing, setEditing, data, query, queryInfo, nodeId });
  const commitInsert = useCommitInsert({
    inserting,
    setInserting,
    query,
    queryInfo,
    nodeId,
    columnTypes,
  });
  const rowActions = useRowActions({
    data,
    query,
    queryInfo,
    nodeId,
    selected: rowSelection.selected,
    closeCellMenu: cellContextMenu.closeCellMenu,
  });
  const canInsert = getEditableTableName(queryInfo) !== null;
  const variableNames = Object.keys(useGetVariablesForNode(nodeId).direct).toSorted();

  const { outbound, inbound } = useMemo(() => {
    const outboundMap: Record<string, Reference[]> = {};
    const inboundMap: Record<string, Reference[]> = {};
    headers.forEach(column => {
      inboundMap[column] = getInboundReferences(queryInfo, schema.references, column);
      outboundMap[column] = getOutboundReferences(queryInfo, schema.references, column);
    });
    return { outbound: outboundMap, inbound: inboundMap };
  }, [headers, queryInfo, schema.references]);

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

  const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rowSelection.count === 0) {
      return;
    }
    const target = e.target as HTMLElement | null;
    // React bubbles synthetic events through the component tree, so portaled
    // children (Mantine Modal, Menu) hit this handler too. Ignore anything
    // whose DOM ancestry is not inside the scroll container.
    if (!target || !e.currentTarget.contains(target)) {
      return;
    }
    if (target.closest("tr[data-index]") || target.closest("thead")) {
      return;
    }
    rowSelection.clear();
  };

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
  const firstItem = virtualItems[0];
  const lastItem = virtualItems.at(-1);
  const paddingTop = firstItem?.start ?? 0;
  const paddingBottom = lastItem ? rowVirtualizer.getTotalSize() - lastItem.end : 0;

  const closeHeaderMenu = () => setHeaderMenu(null);

  const openHeaderMenu = (e: React.MouseEvent, columnIdx: number, header: string) => {
    setHeaderMenu({ x: e.clientX, y: e.clientY, columnIdx, header });
  };

  const onRowAction =
    (action: (rowIndex: number, format: ExportFormat) => void) => (format: ExportFormat) => {
      const rowIndex = cellContextMenu.cellMenu?.rowIndex;
      cellContextMenu.closeCellMenu();
      if (rowIndex !== undefined) {
        action(rowIndex, format);
      }
    };

  const onSelectionAction = (action: (format: ExportFormat) => void) => (format: ExportFormat) => {
    cellContextMenu.closeCellMenu();
    action(format);
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
      onMouseDown={onContainerMouseDown}
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
              variableNames={variableNames}
              inbound={inbound}
              outbound={outbound}
              isSelected={rowSelection.isSelected(virtualRow.index)}
              onSelectMouseDown={rowSelection.onSelectMouseDown}
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
          {canInsert && (
            <InsertRow
              headers={headers}
              columnTypes={columnTypes}
              variableNames={variableNames}
              inserting={inserting}
              setInserting={setInserting}
              onCommit={commitInsert}
            />
          )}
        </Table.Tbody>
      </Table>
      <ResultHeaderMenu
        state={headerMenu}
        onClose={closeHeaderMenu}
        onExportColumn={exportColumn}
        onUseAsVariable={spawnVariableFromColumn}
      />

      <CellContextMenu
        cellMenu={cellContextMenu.cellMenu}
        selected={rowSelection.selected}
        onClose={cellContextMenu.closeCellMenu}
        onUseAsVariable={cellContextMenu.createVariableFromCell}
        onCopyValue={cellContextMenu.copyCellValue}
        onCopyRow={onRowAction(rowActions.copyRow)}
        onCopySelected={onSelectionAction(rowActions.copySelectedRows)}
        onExportRow={onRowAction(rowActions.exportSingleRow)}
        onExportSelected={onSelectionAction(rowActions.exportSelectedRows)}
        onRequestDelete={rowActions.requestDelete}
      />
      <DeleteConfirmModal
        opened={!!rowActions.deleteConfirm}
        rowCount={rowActions.deleteConfirm?.rowCount ?? 0}
        table={rowActions.deleteConfirm?.table || null}
        saving={rowActions.deleteConfirm?.saving ?? false}
        error={rowActions.deleteConfirm?.error ?? null}
        onCancel={rowActions.cancelDelete}
        onConfirm={rowActions.confirmDelete}
      />
    </div>
  );
}
