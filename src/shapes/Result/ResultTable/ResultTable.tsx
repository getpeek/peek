import { Table, Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useRef, useMemo, useEffect } from "react";
import { createShapeId, useEditor } from "tldraw";
import { useVirtualizer } from "@tanstack/react-virtual";
import { schemaAtom } from "../../../state";
import { ResultShape } from "../ResultShape";
import { DataCell } from "./Cell";
import { getInboundReferences, getOutboundReferences } from "./findReferences";
import { AST, Parser } from "node-sql-parser";
import { ChatShape } from "../../Chat/ChatShape";
import { Message } from "../../Ai/useExecutePrompt";
import { sha1 } from "object-hash";
import { useCreateChart } from "../../../tools/useCreateChart";

export const ResultTable = ({ shape }: { shape: ResultShape }) => {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  const schema = useAtomValue(schemaAtom);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const manageChart = useCreateChart(shape);

  const headers = (shape.props.data[0] ?? []).map(([key]) => key);
  const totalRows = shape.props.data.length;

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 5,
    estimateSize: () => 52, // Adjust based on your actual row height with padding
  });

  useEffect(() => {
    const chartShapeId = createShapeId(`${shape.id}-chart`);
    const chart = editor.getShape(chartShapeId);

    if (!chart) {
      return;
    }

    manageChart();
  }, [shape.props.data]);

  useEffect(() => {
    const chatShapeId = createShapeId(`${shape.id}-chat`);
    const chatShape = editor.getShape<ChatShape>(chatShapeId);

    if (!chatShape) {
      return;
    }

    const contextKey = sha1({
      query: shape.props.query,
      data: shape.props.data,
      schema,
    });

    const alreadyExists = chatShape.props.messages.some(
      (msg) => msg.type === "context" && msg.contextKey === contextKey,
    );

    if (alreadyExists) {
      return;
    }

    const contextMessage: Message = {
      type: "context",
      message: `I've updated the query, it now looks like this:

      ${shape.props.query}

      And that made the data look like this

      ${JSON.stringify(shape.props.data)}
      `,
      contextKey,
      timestamp: Date.now(),
    };

    editor.updateShape({
      ...chatShape,
      props: {
        messages: [...chatShape.props.messages, contextMessage],
      },
    });
  }, [shape.props.query, shape.props.data, editor, shape.id]);

  const ast = useMemo(() => {
    try {
      const astOptions = new Parser().astify(shape.props.query);
      return Array.isArray(astOptions) ? astOptions[0] : astOptions;
    } catch {
      return {} as AST;
    }
  }, [shape.props.query]);

  const { outbound, inbound } = useMemo(() => {
    const outbound: Record<string, { table: string; column: string }[]> = {};
    const inbound: Record<string, { table: string; column: string }[]> = {};
    headers.forEach((column) => {
      outbound[column] = getInboundReferences(ast, schema.references, column);
      inbound[column] = getOutboundReferences(ast, schema.references, column);
    });

    return { outbound, inbound };
  }, [headers, ast, schema.references]);

  if (shape.props.data.length === 0) {
    return (
      <div
        className="no-results"
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <Text c="var(--remove-color)">No results</Text>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div
      style={{
        width: shape.props.w,
        height: shape.props.h,
        pointerEvents: isEditing ? "all" : "auto",
        overflow: "auto",
        position: "relative",
      }}
      ref={scrollContainerRef}
    >
      <Table
        stickyHeader
        borderColor="var(--border-base)"
        style={{
          width: "100%",
          userSelect: "all",
        }}
      >
        <Table.Thead>
          <Table.Tr className="header-row">
            {headers.map((header, i) => {
              const hasInbound = inbound[header]?.length > 0;
              const hasOutbound = outbound[header]?.length > 0;
              const headerClasses = ["header"];

              if (hasInbound) {
                headerClasses.push("inbound");
              } else if (hasOutbound) {
                headerClasses.push("outbound");
              }

              return (
                <Table.Th key={i} className={headerClasses.join(" ")} p={16}>
                  <Text fw="bold" c="gray">
                    {header}
                    {hasInbound && hasOutbound && " ↕"}
                    {hasInbound && !hasOutbound && " ↑"}
                    {hasOutbound && !hasInbound && " ↓"}
                  </Text>
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
            <Table.Tr key={virtualRow.key}>
              {shape.props.data[virtualRow.index].map(
                ([column, value, type], o) => {
                  const hasInbound = inbound[column]?.length > 0;
                  const hasOutbound = outbound[column]?.length > 0;

                  const cellClasses = ["cell"];

                  if (hasInbound) {
                    cellClasses.push("inbound");
                  } else if (hasOutbound) {
                    cellClasses.push("outbound");
                  }

                  if (virtualRow.index % 2 === 0) {
                    cellClasses.push("even");
                  }

                  return (
                    <Table.Td key={o} className={cellClasses.join(" ")} p={16}>
                      <DataCell
                        value={value}
                        type={type}
                        outbound={outbound[column]}
                        inbound={inbound[column]}
                      />
                    </Table.Td>
                  );
                },
              )}
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
};
