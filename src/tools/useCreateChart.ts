import { createShapeId, TLShape, useEditor } from "tldraw";
import { createArrowBetweenShapes } from "./createArrowBetweenShapes";
import { ResultShapeUtil } from "../shapes/Result/ResultShape";

export const useCreateChart = (shape: TLShape) => {
  const editor = useEditor();

  return () => {
    if (shape.type !== "result") {
      return;
    }

    const props = shape.props as ReturnType<ResultShapeUtil["getDefaultProps"]>;

    if (props.data.length === 0) {
      return;
    }

    const fields = [];

    for (const row of props.data) {
      let has_label = false;

      const chart_data: Record<string, string | number> = {};

      for (const [key, value] of row) {
        if (typeof value === "number") {
          chart_data[key] = value;
        } else if (typeof value === "string" && !has_label) {
          chart_data[key] = value;
          has_label = true;
        }
      }

      fields.push(chart_data);
    }

    const chartShapeId = createShapeId(shape.id + "-chart");

    const chartShape = editor.getShape(chartShapeId);

    if (chartShape) {
      editor.updateShape({
        id: chartShapeId,
        type: "barchart",
        props: {
          data: fields,
        },
      });
    } else {
      editor.createShape({
        type: "barchart",
        id: chartShapeId,
        x: shape.x,
        y: shape.y - 540,
        props: {
          data: fields,
          w: Math.max(props.w, 500),
          h: 500,
        },
      });
    }

    editor.select(chartShapeId);
    editor.zoomToSelection({ animation: { duration: 300 } });

    createArrowBetweenShapes(editor, shape.id, chartShapeId);
  };
};
