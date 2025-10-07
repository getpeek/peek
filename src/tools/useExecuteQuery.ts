import { createShapeId, TLShape, TLShapeId, useEditor } from "tldraw";
import { createArrowBetweenShapes } from "./createArrowBetweenShapes";
import { invoke } from "@tauri-apps/api/core";
import { QueryErrorShape } from "../shapes/Error/ErrorShape";

export const useExecuteQueries = () => {
  const editor = useEditor();

  return async (shape: TLShape, queries: string[]) => {
    let lastCreatedId: TLShapeId | null = null;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        const response = (await invoke("get_results", { query })) as string;
        const result = JSON.parse(response) as [string, unknown][][];

        let x = (editor.getSelectionPageBounds()?.right ?? shape.x) +
          (lastCreatedId === null ? 50 : 0);
        let y = shape.y;
        if (lastCreatedId) {
          const bounds = editor.getShapePageBounds(lastCreatedId);
          if (bounds) {
            y = bounds.bottom + 50;
            x = bounds.left;
          }
        }

        if (queries.length > 1 && result.length === 0) {
          continue;
        }

        const columnCount = result[0]?.length ?? 0;
        const resultShapeId = createShapeId(shape.id + "-result-" + i);
        const errorShapeId = createShapeId(shape.id + "-error");

        const resultShape = editor.getShape(resultShapeId);

        if (resultShape) {
          editor.updateShape({
            id: resultShapeId,
            type: "result",
            props: {
              data: result,
              query,
              w: Math.max(columnCount * 250, 200),
              h: Math.min(result.length * 50 + 50, 1500),
            },
          });
        } else {
          editor.createShape({
            id: resultShapeId,
            type: "result",
            x: x + 50,
            y,
            props: {
              data: result,
              query,
              w: Math.max(columnCount * 250, 200),
              h: Math.min(result.length * 50 + 50, 1500),
            },
          });
          lastCreatedId = resultShapeId;
          createArrowBetweenShapes(editor, shape.id, resultShapeId);
        }

        editor.deleteShape(errorShapeId);

        editor.select(resultShapeId);
        editor.zoomToSelection({ animation: { duration: 300 } });
      } catch (e) {
        const errorShapeId = createShapeId(shape.id + "-error");

        let y = undefined;
        if ("h" in shape.props) {
          y = shape.y + shape.props.h + 50;
        }

        editor.createShape<QueryErrorShape>({
          id: errorShapeId,
          type: "query-error",
          x: shape.x,
          y,
          props: {
            queryShapeId: shape.id,
            query,
            message: `${e}`,
          },
        });

        createArrowBetweenShapes(editor, errorShapeId, shape.id);

        editor.select(errorShapeId);
        editor.zoomToSelection({ animation: { duration: 300 } });
      }
    }
  };
};
