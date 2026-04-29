import type { NodeProps } from "@xyflow/react";
import { getStroke } from "perfect-freehand";
import { HiddenHandles } from "../HiddenHandles";
import type { DrawNode as DrawNodeT } from "../../types";

export function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length === 0) {
    return "";
  }
  const d = stroke.reduce<number[]>((path, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    path.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    return path;
  }, []);

  return `M${d[0].toFixed(2)},${d[1].toFixed(2)} Q${d
    .slice(2)
    .map((n) => n.toFixed(2))
    .join(" ")} Z`;
}

const SELECTED_COLOR = "#7dd3fc";

export function DrawNode({ data, selected, width, height }: NodeProps<DrawNodeT>) {
  const outline = getStroke(data.points, {
    size: data.strokeWidth * 4,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  });
  const d = getSvgPathFromStroke(outline);
  const fill = selected ? SELECTED_COLOR : data.color;

  return (
    <>
      <HiddenHandles />
      <div style={{ width, height, position: "relative" }}>
        <svg width={width} height={height} style={{ display: "block", overflow: "hidden" }}>
          <path d={d} fill={fill} pointerEvents="all" />
        </svg>
      </div>
    </>
  );
}
