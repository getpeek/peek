import { NodeProps, NodeResizer } from "@xyflow/react";
import { BarChart } from "@mantine/charts";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import type { BarChartNode as BarChartNodeT } from "../../types";
import "../node.css";

const DEFAULT_W = 460;
const DEFAULT_H = 290;

const barColors = [
  "var(--pk-accent)",
  "var(--pk-blue)",
  "var(--pk-green)",
  "var(--pk-yellow)",
  "var(--pk-red)",
];

export function BarChartNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<BarChartNodeT>) {
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  if (data.data.length === 0) {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={300} minHeight={200} />
        <HiddenHandles />
        <div
          className={`app-node ${selected ? "selected" : ""}`}
          style={{ width: w, height: h }}
        >
          <NodeHeader nodeId={id} type="barchart" name="empty" />
          <div className="chart-body">No results</div>
        </div>
      </>
    );
  }

  const [dataKey] = Object.entries(data.data[0]).find(
    ([, value]) => typeof value === "string",
  ) ?? ["name"];

  const series = Object.entries(data.data[0])
    .filter(
      ([key, value]) =>
        typeof value === "number" && key !== "id" && !key.endsWith("_id"),
    )
    .map(([key], i) => ({
      name: key,
      color: barColors[i % barColors.length],
    }));

  const seriesName = series[0]?.name ?? "value";

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={300} minHeight={200} />
      <HiddenHandles />
      <div
        className={`app-node ${selected ? "selected" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader
          nodeId={id}
          type="barchart"
          name={`${seriesName} by ${dataKey}`}
        />
        <div className="chart-body nodrag">
          <div className="chart-title">
            <span>{seriesName}</span>
            <span className="chart-tag">bar</span>
          </div>
          <div className="chart-sub">
            by {dataKey} · {data.data.length} bars
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <BarChart
              h="100%"
              w="100%"
              mih={undefined}
              data={data.data}
              dataKey={dataKey}
              series={series}
              tickLine="y"
              gridAxis="none"
            />
          </div>
        </div>
      </div>
    </>
  );
}
