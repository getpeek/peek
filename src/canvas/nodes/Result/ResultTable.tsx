import { Table, Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { schemaAtom } from "../../../state";
import {
  getInboundReferences,
  getOutboundReferences,
  type CellReference,
} from "../../../shapes/Result/ResultTable/findReferences";
import { DataCell } from "./Cell";
import { AST, Parser } from "node-sql-parser";
import type { DatabaseResult } from "../../../state";
import type { ResultData } from "../../types";
import { useCanvas } from "../../useCanvas";
import { useExecuteQueries } from "../../useExecuteQueries";
import {
  buildPkAssignments,
  buildUpdateSql,
  formatSqlLiteral,
  getEditableTableName,
} from "./inlineEdit";
import "../../../shapes/Result/ResultShape.css";

const MONO_CHAR_PX = 7.2;
const CELL_PADDING_PX = 28;
const MIN_COL_W = 80;
const MAX_DEFAULT_COL_W = 360;
const MIN_DRAG_W = 40;
const SAMPLE_ROWS = 30;

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

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
  const [containerWidth, setContainerWidth] = useState(0);
  const [draftWidth, setDraftWidth] = useState<{
    column: string;
    width: number;
  } | null>(null);
  const [editing, setEditing] = useState<{
    row: number;
    col: number;
    draft: string;
    error: string | null;
    saving: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const followReferences = (refs: CellReference[], value: unknown) => {
    const sourceNode = canvas.getNode(nodeId);
    if (!sourceNode) return;
    const queries = refs.map(
      (ref) => `SELECT * FROM ${ref.table} WHERE ${ref.column} = '${value}' LIMIT 300`,
    );
    executeQueries(sourceNode, queries);
  };

  const headers = (data[0] ?? []).map(([key]) => key);
  const headerTypes = (data[0] ?? []).map(([, , type]) => type);
  const totalRows = data.length;

  const defaultWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    const sampleEnd = Math.min(SAMPLE_ROWS, data.length);
    headers.forEach((header, colIdx) => {
      let maxLen = header.length;
      for (let r = 0; r < sampleEnd; r++) {
        const cell = data[r]?.[colIdx];
        if (!cell) continue;
        const len = stringifyValue(cell[1]).length;
        if (len > maxLen) maxLen = len;
      }
      const px = Math.round(maxLen * MONO_CHAR_PX + CELL_PADDING_PX);
      widths[header] = Math.max(MIN_COL_W, Math.min(MAX_DEFAULT_COL_W, px));
    });
    return widths;
  }, [data, headers]);

  const naturalWidthFor = (col: string): number => {
    if (draftWidth?.column === col) return draftWidth.width;
    return columnWidths?.[col] ?? defaultWidths[col] ?? MIN_COL_W;
  };

  const naturalTotalWidth = headers.reduce((sum, h) => sum + naturalWidthFor(h), 0);

  const shouldExpand = containerWidth > 0 && naturalTotalWidth < containerWidth;
  const scale = shouldExpand ? containerWidth / naturalTotalWidth : 1;

  const widthFor = (col: string): number => naturalWidthFor(col) * scale;
  const totalWidth = shouldExpand ? containerWidth : naturalTotalWidth;

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, column: string) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths?.[column] ?? defaultWidths[column] ?? MIN_COL_W;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const next = Math.max(MIN_DRAG_W, startWidth + (ev.clientX - startX));
        setDraftWidth({ column, width: next });
      };
      const onUp = (ev: PointerEvent) => {
        const finalWidth = Math.max(MIN_DRAG_W, startWidth + (ev.clientX - startX));
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
        setDraftWidth(null);
        canvas.updateNodeData<ResultData>(nodeId, (d) => ({
          ...d,
          columnWidths: { ...(d.columnWidths ?? {}), [column]: finalWidth },
        }));
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    [canvas, columnWidths, defaultWidths, nodeId],
  );

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 8,
    estimateSize: () => 38,
  });

  const ast = useMemo(() => {
    try {
      const astOptions = new Parser().astify(query);
      return Array.isArray(astOptions) ? astOptions[0] : astOptions;
    } catch {
      return {} as AST;
    }
  }, [query]);

  const editableTable = useMemo(() => getEditableTableName(ast), [ast]);

  const commitEdit = useCallback(async () => {
    if (!editing) return;
    const { row, col, draft } = editing;
    const rowData = data[row];
    if (!rowData) return;
    const cell = rowData[col];
    if (!cell) return;
    const [columnName, , columnType] = cell;

    if (!editableTable) {
      setEditing((e) =>
        e
          ? {
              ...e,
              error: "Cannot edit: query is not a single-table SELECT",
            }
          : e,
      );
      return;
    }

    const pkColumns = schema.primaryKeys[editableTable] ?? [];
    if (pkColumns.length === 0) {
      setEditing((e) =>
        e
          ? {
              ...e,
              error: `Cannot edit: no primary key on "${editableTable}"`,
            }
          : e,
      );
      return;
    }

    const pks = buildPkAssignments(rowData, pkColumns);
    if (!pks) {
      setEditing((e) =>
        e
          ? {
              ...e,
              error: `Row is missing primary key columns (${pkColumns.join(", ")})`,
            }
          : e,
      );
      return;
    }

    let updateSql: string;
    try {
      const newLiteral = draft === "" ? "NULL" : formatSqlLiteral(draft, columnType);
      updateSql = buildUpdateSql(editableTable, columnName, newLiteral, pks);
    } catch (err) {
      setEditing((e) => (e ? { ...e, error: String(err) } : e));
      return;
    }

    setEditing((e) => (e ? { ...e, saving: true, error: null } : e));
    try {
      await invoke("execute_statement", { query: updateSql });
      const refreshed = JSON.parse(
        (await invoke("get_results", { query })) as string,
      ) as DatabaseResult;
      canvas.updateNodeData<ResultData>(nodeId, (d) => ({
        ...d,
        data: refreshed,
      }));
      setEditing(null);
    } catch (err) {
      setEditing((e) => (e ? { ...e, saving: false, error: String(err) } : e));
    }
  }, [editing, data, editableTable, schema.primaryKeys, canvas, nodeId, query]);

  const { outbound, inbound } = useMemo(() => {
    const outbound: Record<string, { table: string; column: string }[]> = {};
    const inbound: Record<string, { table: string; column: string }[]> = {};
    headers.forEach((column) => {
      inbound[column] = getInboundReferences(ast, schema.references, column);
      outbound[column] = getOutboundReferences(ast, schema.references, column);
    });
    return { outbound, inbound };
  }, [headers, ast, schema.references]);

  if (data.length === 0) {
    return (
      <div className="no-results" style={{ padding: 16 }}>
        <Text c="var(--pk-fg-muted)">No results</Text>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

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
          {headers.map((header, i) => (
            <col key={i} style={{ width: widthFor(header) }} />
          ))}
        </colgroup>
        <Table.Thead>
          <Table.Tr>
            {headers.map((header, i) => {
              const hasInbound = inbound[header]?.length > 0;
              const hasOutbound = outbound[header]?.length > 0;
              const isPk = hasInbound || /^id$/i.test(header) || (i === 0 && /_id$/i.test(header));
              const isFk = !isPk && (hasOutbound || /_id$/i.test(header));
              const headerClasses: string[] = [];
              if (isPk) headerClasses.push("pk");
              else if (isFk) headerClasses.push("fk");
              const colType = (headerTypes[i] || "").toUpperCase();
              return (
                <Table.Th key={i} className={headerClasses.join(" ")}>
                  <div className="col-meta">
                    <span className="col-name">
                      {header}
                      {isPk && <span className="col-tag pk">PK</span>}
                      {isFk && <span className="col-tag fk">FK</span>}
                    </span>
                    {colType && <span className="col-type">{colType}</span>}
                  </div>
                  <div
                    className="col-resize-handle"
                    onPointerDown={(e) => startResize(e, header)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                </Table.Th>
              );
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td
                colSpan={headers.length}
                style={{
                  height: paddingTop,
                  padding: 0,
                  border: "none",
                }}
              />
            </tr>
          )}
          {virtualItems.map((virtualRow) => (
            <Table.Tr
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
            >
              {data[virtualRow.index].map(([column, value, type], o) => {
                const hasInbound = inbound[column]?.length > 0;
                const hasOutbound = outbound[column]?.length > 0;
                const isPk =
                  hasInbound || /^id$/i.test(column) || (o === 0 && /_id$/i.test(column));
                const isFk = !isPk && (hasOutbound || /_id$/i.test(column));
                const cellClasses: string[] = ["editable"];
                if (isPk) cellClasses.push("pk");
                else if (isFk) cellClasses.push("fk");
                if (virtualRow.index % 2 === 0) cellClasses.push("even");
                const isEditing = editing?.row === virtualRow.index && editing?.col === o;
                if (isEditing) cellClasses.push("editing");
                if (isEditing && editing?.error) cellClasses.push("error");
                return (
                  <Table.Td
                    key={o}
                    className={cellClasses.join(" ")}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditing({
                        row: virtualRow.index,
                        col: o,
                        draft: stringifyValue(value),
                        error: null,
                        saving: false,
                      });
                    }}
                  >
                    {isEditing ? (
                      <EditCell
                        type={type}
                        draft={editing!.draft}
                        error={editing!.error}
                        saving={editing!.saving}
                        onChange={(v) => setEditing((e) => (e ? { ...e, draft: v } : e))}
                        onCommit={commitEdit}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <DataCell
                        value={value}
                        type={type}
                        outbound={outbound[column]}
                        inbound={inbound[column]}
                        onInboundClick={followReferences}
                        onOutboundClick={followReferences}
                      />
                    )}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
          {paddingBottom > 0 && (
            <tr>
              <td
                colSpan={headers.length}
                style={{
                  height: paddingBottom,
                  padding: 0,
                  border: "none",
                }}
              />
            </tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}

function EditCell({
  type,
  draft,
  error,
  saving,
  onChange,
  onCommit,
  onCancel,
}: {
  type: string;
  draft: string;
  error: string | null;
  saving: boolean;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const isMultiline = type === "JSON" || type === "JSONB";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.metaKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onCommit();
    }
  };

  const common = {
    value: draft,
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onKeyDown,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    className: "edit-input",
    spellCheck: false,
  };

  return (
    <div className="edit-wrapper">
      {isMultiline ? (
        <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={3} {...common} />
      ) : (
        <input ref={ref as React.RefObject<HTMLInputElement>} type="text" {...common} />
      )}
      {error && <div className="edit-error">{error}</div>}
    </div>
  );
}
