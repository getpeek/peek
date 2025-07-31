import { Paper, Table, Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useRef, useMemo, useEffect } from "react";
import { createShapeId, HTMLContainer, useEditor } from "tldraw";
import { useVirtualizer } from "@tanstack/react-virtual";
import { schemaAtom } from "../../../state";
import { ResultShape } from "../ResultShape";
import { DataCell } from "./Cell";
import { getInboundReferences, getOutboundReferences } from "./findReferences";
import { AST, Parser } from "node-sql-parser";
import { ChatShape } from "../../Chat/ChatShape";
import { Message } from "../../Ai/useExecutePrompt";
import { sha1 } from "object-hash";

export const ResultTable = ({ shape }: { shape: ResultShape }) => {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  const schema = useAtomValue(schemaAtom);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const headers = (shape.props.data[0] ?? []).map(([key]) => key);
  const totalRows = shape.props.data.length;

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 40,
    estimateSize: () => 40,
  });

  useEffect(() => {
    const chatShapeId = createShapeId(`${shape.id}-chat`);
    const chatShape = editor.getShape<ChatShape>(chatShapeId);

    if (!chatShape) {
      return;
    }

    const contextKey = sha1({
      query: shape.props.query,
      data: shape.props.data,
    });

    // Check if context with this key already exists in the messages
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
      <HTMLContainer>
        <Paper shadow="md" color="blue" c="blue">
          <div
            style={{
              width: shape.props.w,
              height: shape.props.h,
            }}
            className="no-results"
          >
            No results
          </div>
        </Paper>
      </HTMLContainer>
    );
  }

  return (
    <HTMLContainer id={shape.id}>
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
          striped
          withColumnBorders
          borderColor="var(--border-base)"
          style={{
            position: "absolute",
            width: "100%",
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
                  <Table.Th key={i} className={headerClasses.join(" ")}>
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
            {rowVirtualizer.getVirtualItems().map((row, i) => (
              <Table.Tr key={row.key}>
                {shape.props.data[row.index].map(([column, value, type], o) => {
                  const hasInbound = inbound[column]?.length > 0;
                  const hasOutbound = outbound[column]?.length > 0;

                  const cellClasses = ["cell"];

                  if (hasInbound) {
                    cellClasses.push("inbound");
                  } else if (hasOutbound) {
                    cellClasses.push("outbound");
                  }

                  if (i % 2 === 0) {
                    cellClasses.push("even");
                  }

                  return (
                    <Table.Td key={o} className={cellClasses.join(" ")}>
                      <DataCell
                        value={value}
                        type={type}
                        outbound={outbound[column]}
                        inbound={inbound[column]}
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </HTMLContainer>
  );
};
