import { invoke } from "@tauri-apps/api/core";
import { ids } from "./ids";
import type { CanvasApi } from "./state";
import type {
  AppNode,
  ErrorData,
  QueryErrorNode,
  ResultNode,
} from "./types";

export async function executeQueries(
  canvas: CanvasApi,
  sourceNode: AppNode,
  queries: string[],
) {
  let lastCreatedId: string | null = null;

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      const response = (await invoke("get_results", { query })) as string;
      const result = JSON.parse(response) as [string, unknown, string][][];

      if (queries.length > 1 && result.length === 0) {
        continue;
      }

      let x = sourceNode.position.x + (sourceNode.width ?? 350) + 50;
      let y = sourceNode.position.y;
      if (lastCreatedId) {
        const last = canvas.getNode(lastCreatedId);
        if (last) {
          x = last.position.x;
          y = last.position.y + (last.height ?? 440) + 50;
        }
      }

      const columnCount = result[0]?.length ?? 0;
      const w = Math.max(columnCount * 250, 200);
      const h = Math.min(result.length * 50 + 50, 1500);

      const resultNodeId = ids.result(sourceNode.id, i);
      const errorNodeId = ids.error(sourceNode.id);
      const existing = canvas.getNode(resultNodeId);

      if (existing) {
        canvas.updateNode(resultNodeId, (n) =>
          ({
            ...n,
            width: w,
            height: h,
            data: { data: result, query },
          }) as AppNode,
        );
      } else {
        const resultNode: ResultNode = {
          id: resultNodeId,
          type: "result",
          position: { x, y },
          width: w,
          height: h,
          data: { data: result, query },
        };
        canvas.addNode(resultNode);
        canvas.connect(sourceNode.id, resultNodeId);
        lastCreatedId = resultNodeId;
      }

      const existingError = canvas.getNode(errorNodeId);
      if (existingError) {
        canvas.deleteNode(errorNodeId);
      }

      canvas.selectOnly(resultNodeId);
      canvas.zoomToNode(resultNodeId, { duration: 300 });
    } catch (e) {
      const errorNodeId = ids.error(sourceNode.id);
      const errorY = sourceNode.position.y + (sourceNode.height ?? 240) + 50;

      const errorData: ErrorData = {
        queryNodeId: sourceNode.id,
        query,
        message: `${e}`,
      };

      const existing = canvas.getNode(errorNodeId);
      if (existing) {
        canvas.updateNode(errorNodeId, (n) =>
          ({ ...n, data: errorData }) as AppNode,
        );
      } else {
        const errorNode: QueryErrorNode = {
          id: errorNodeId,
          type: "query-error",
          position: { x: sourceNode.position.x, y: errorY },
          width: 400,
          height: 300,
          data: errorData,
        };
        canvas.addNode(errorNode);
        canvas.connect(errorNodeId, sourceNode.id);
      }

      canvas.selectOnly(errorNodeId);
      canvas.zoomToNode(errorNodeId, { duration: 300 });
    }
  }
}
