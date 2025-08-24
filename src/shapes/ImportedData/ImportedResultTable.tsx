import { Table, Text } from "@mantine/core";
import { useRef, useEffect } from "react";
import { createShapeId, useEditor } from "tldraw";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DataCell } from "../Result/ResultTable/Cell";
import { useCreateChart } from "../../tools/useCreateChart";
import { ImportedDataSourceShape } from "./ImportedDataShape";

export const ImportedResultTable = ({
  shape,
}: {
  shape: ImportedDataSourceShape;
}) => {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const manageChart = useCreateChart(shape);

  const headers = (shape.props.data[0] ?? []).map(([key]) => key);
  const totalRows = shape.props.data.length;

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 5,
    estimateSize: () => 52,
  });

  useEffect(() => {
    const chartShapeId = createShapeId(`${shape.id}-chart`);
    const chart = editor.getShape(chartShapeId);

    if (!chart) {
      return;
    }

    manageChart();
  }, [shape.props.data]);

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
              return (
                <Table.Th key={i} className="header" p={16}>
                  <Text fw="bold" c="gray">
                    {header}
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
              {shape.props.data[virtualRow.index].map(([, value], o) => {
                return (
                  <Table.Td key={o} className="cell" p={16}>
                    <DataCell
                      value={value}
                      type={typeof value}
                      outbound={[]}
                      inbound={[]}
                    />
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
};
