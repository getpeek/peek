import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
} from "tldraw";
import { BarChart } from "@mantine/charts";

type BarChartShape = TLBaseShape<
  "barchart",
  { data: { key: string; value: number }[]; w: number; h: number }
>;

const barColors = [
  "var(--mantine-color-blue-7)",
  "var(--mantine-color-yellow-7)",
  "var(--mantine-color-green-7)",
  "var(--mantine-color-purple-7)",
  "var(--mantine-color-orange-7)",
];

export class BarChartShapeUtil extends ShapeUtil<BarChartShape> {
  static override type = "barchart" as const;

  override canResize = () => true;
  override canEdit = () => true;
  override canScroll = () => true;

  component(shape: BarChartShape) {
    const isEditing = this.editor.getEditingShapeId() === shape.id;

    if (shape.props.data.length === 0) {
      return <HTMLContainer>No results</HTMLContainer>;
    }

    const [dataKey] = Object.entries(shape.props.data[0]).find(
      ([, value]) => typeof value === "string",
    ) ?? ["name"];

    const series = Object.entries(shape.props.data[0])
      .filter(
        ([key, value]) =>
          typeof value === "number" && key !== "id" && !key.endsWith("_id"),
      )
      .map(([key], i) => ({
        name: key,
        color: barColors[i % barColors.length],
      }));

    return (
      <HTMLContainer id={shape.id}>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            pointerEvents: isEditing ? "all" : undefined,
          }}
        >
          <BarChart
            h="100%"
            w="100%"
            mih={undefined}
            data={shape.props.data}
            dataKey={dataKey}
            series={series}
            tickLine="y"
          />
        </div>
      </HTMLContainer>
    );
  }

  getDefaultProps(): {
    data: { key: string; value: number }[];
    w: number;
    h: number;
  } {
    return {
      data: [],
      w: 300,
      h: 500,
    };
  }

  getGeometry(shape: BarChartShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: BarChartShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }

  override onResize(shape: BarChartShape, info: any) {
    return resizeBox(shape, info);
  }
}
