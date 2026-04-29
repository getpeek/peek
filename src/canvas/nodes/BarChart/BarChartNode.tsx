import { NodeProps, NodeResizer } from "@xyflow/react";
import { AreaChart, BarChart, LineChart } from "@mantine/charts";
import { IconChartArea, IconChartBar, IconChartLine } from "@tabler/icons-react";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { useCanvas } from "../../useCanvas";
import type { BarChartData, BarChartNode as BarChartNodeT, ChartType } from "../../types";
import "../node.css";

const DEFAULT_W = 460;
const DEFAULT_H = 290;

const seriesColors = [
  "var(--pk-accent)",
  "var(--pk-blue)",
  "var(--pk-green)",
  "var(--pk-yellow)",
  "var(--pk-red)",
];

const CHART_TYPE_OPTIONS: {
  type: ChartType;
  label: string;
  Icon: typeof IconChartBar;
}[] = [
  { type: "bar", label: "Bar", Icon: IconChartBar },
  { type: "line", label: "Line", Icon: IconChartLine },
  { type: "area", label: "Area", Icon: IconChartArea },
];

export function BarChartNode({ id, data, selected, width, height }: NodeProps<BarChartNodeT>) {
  const canvas = useCanvas();
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const chartType: ChartType = data.chartType ?? "bar";

  const setChartType = (next: ChartType) => {
    if (next === chartType) {
      return;
    }
    canvas.updateNodeData<BarChartData>(id, { chartType: next });
  };

  if (data.data.length === 0) {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={300} minHeight={200} />
        <HiddenHandles />
        <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
          <NodeHeader nodeId={id} type="barchart" name="empty" />
          <div className="chart-body">No results</div>
        </div>
      </>
    );
  }

  const [dataKey] = Object.entries(data.data[0]).find(([, value]) => typeof value === "string") ?? [
    "name",
  ];

  const series = Object.entries(data.data[0])
    .filter(([key, value]) => typeof value === "number" && key !== "id" && !key.endsWith("_id"))
    .map(([key], i) => ({
      name: key,
      color: seriesColors[i % seriesColors.length],
    }));

  const seriesName = series[0]?.name ?? "value";

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={300} minHeight={200} />
      <HiddenHandles />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader nodeId={id} type="barchart" name={`${seriesName} by ${dataKey}`} />
        <div className="chart-body nodrag">
          <div className="chart-title">
            <span>{seriesName}</span>
            <div className="chart-type-toggle">
              {CHART_TYPE_OPTIONS.map(({ type, label, Icon }) => (
                <button
                  key={type}
                  type="button"
                  title={label}
                  className={`chart-type-btn ${chartType === type ? "active" : ""}`}
                  onClick={() => setChartType(type)}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
          <div className="chart-sub">
            by {dataKey} · {data.data.length} points
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {chartType === "bar" && (
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
            )}
            {chartType === "line" && (
              <LineChart
                h="100%"
                w="100%"
                mih={undefined}
                data={data.data}
                dataKey={dataKey}
                series={series}
                tickLine="y"
                gridAxis="none"
                withDots={false}
                curveType="monotone"
              />
            )}
            {chartType === "area" && (
              <AreaChart
                h="100%"
                w="100%"
                mih={undefined}
                data={data.data}
                dataKey={dataKey}
                series={series}
                tickLine="y"
                gridAxis="none"
                withDots={false}
                curveType="monotone"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
