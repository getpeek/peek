import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "./DrawNode";
import type { DrawPoint } from "../../types";

interface LiveStrokeProps {
  points: DrawPoint[];
  strokeWidth: number;
  color: string;
  zoom: number;
}

export function LiveStroke({ points, strokeWidth, color, zoom }: LiveStrokeProps) {
  if (points.length <= 1) {
    return null;
  }

  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <path
        d={getSvgPathFromStroke(
          getStroke(points, {
            size: strokeWidth * 4 * zoom,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
          }),
        )}
        fill={color}
      />
    </svg>
  );
}
