import { invoke } from "@tauri-apps/api/core";
import { Editor, createShapeId } from "tldraw";
import { createArrowBetweenShapes } from "./createArrowBetweenShapes";

export const executeAllQueriesOnPage = async (editor: Editor) => {
  const allShapes = editor.getCurrentPageShapes();
  const queryShapes = allShapes.filter((shape) => shape.type === "query");

  const results: { shapeId: string; success: boolean; error?: any }[] = [];

  for (const shape of queryShapes) {
    if (!("query" in shape.props) || typeof shape.props.query !== "string") {
      continue;
    }

    const query = shape.props.query.trim();
    if (!query) {
      continue;
    }

    try {
      const response = (await invoke("get_results", { query })) as string;
      const result = JSON.parse(response) as [string, unknown][][];

      const resultShapeId = createShapeId(shape.id + "-result-0");
      const existingShape = editor.getShape(resultShapeId);

      if (existingShape) {
        editor.updateShape({
          id: resultShapeId,
          type: "result",
          props: {
            data: result,
            query,
          },
        });
      } else {
        const columnCount = result[0]?.length ?? 0;
        editor.createShape({
          id: resultShapeId,
          type: "result",
          x: shape.x + 300,
          y: shape.y,
          props: {
            data: result,
            query,
            w: Math.max(columnCount * 250, 200),
            h: Math.min(result.length * 45 + 40, 1500),
          },
        });

        createArrowBetweenShapes(editor, shape.id, resultShapeId);
      }

      results.push({ shapeId: shape.id, success: true });
    } catch (error) {
      const errorShapeId = createShapeId(shape.id + "-error");
      const existingError = editor.getShape(errorShapeId);

      if (!existingError) {
        editor.createShape({
          id: errorShapeId,
          type: "query-error",
          x: shape.x,
          y: shape.y - 130,
          props: {
            message: String(error),
          },
        });
      }

      results.push({ shapeId: shape.id, success: false, error });
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return results;
};
