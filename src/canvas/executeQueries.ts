import { invoke } from "@tauri-apps/api/core";
import { ids } from "./ids";
import type { CanvasApi } from "./state";
import type { DatabaseResult } from "../state";
import type {
  AppNode,
  ErrorData,
  QueryData,
  QueryErrorNode,
  ResultData,
  ResultNode,
} from "./types";
import { collectVariablesFor, substituteVariables } from "./variables";

export type SetResults = (
  updater:
    | Record<string, DatabaseResult>
    | ((prev: Record<string, DatabaseResult>) => Record<string, DatabaseResult>),
) => void;

export async function executeQueries(
  canvas: CanvasApi,
  setResults: SetResults,
  sourceNode: AppNode,
  queries: string[],
) {
  let lastCreatedId: string | null = null;
  const createdIds: string[] = [];

  const vars = collectVariablesFor(canvas, sourceNode.id);

  const isQuerySource = sourceNode.type === "query";
  if (isQuerySource) {
    canvas.updateNodeData<QueryData>(sourceNode.id, { isRunning: true });
  }

  try {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        const { resolved, missing } = substituteVariables(query, vars);
        if (missing.length > 0) {
          throw new Error(`Undefined variables: ${missing.map((m) => "@" + m).join(", ")}`);
        }
        const response = (await invoke("get_results", {
          query: resolved,
        })) as string;
        const result = JSON.parse(response) as DatabaseResult;

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
        const w = result.length === 0 ? 400 : Math.max(columnCount * 250, 200);
        const h = result.length === 0 ? 600 : Math.min(result.length * 50 + 50, 1500);

        const resultNodeId = ids.result(sourceNode.id, i);
        const errorNodeId = ids.error(sourceNode.id);
        const existing = canvas.getNode(resultNodeId);

        setResults((prev) => ({ ...prev, [resultNodeId]: result }));

        if (existing) {
          canvas.updateNode(
            resultNodeId,
            (n) =>
              ({
                ...n,
                data: { ...(n.data as ResultData), query },
              }) as AppNode,
          );
        } else {
          const resultNode: ResultNode = {
            id: resultNodeId,
            type: "result",
            position: { x, y },
            width: w,
            height: h,
            data: { query },
          };
          canvas.addNode(resultNode);
          canvas.connect(sourceNode.id, resultNodeId);
          lastCreatedId = resultNodeId;
          createdIds.push(resultNodeId);
        }

        const existingError = canvas.getNode(errorNodeId);
        if (existingError) {
          canvas.deleteNode(errorNodeId);
        }
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
          canvas.updateNode(errorNodeId, (n) => ({ ...n, data: errorData }) as AppNode);
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
          createdIds.push(errorNodeId);
        }
      }
    }

    if (createdIds.length === 1) {
      canvas.selectOnly(createdIds[0]);
      canvas.zoomToNode(createdIds[0], { duration: 300 });
    } else if (createdIds.length > 1) {
      canvas.selectOnly(createdIds);
      canvas.zoomToNodes(createdIds, { duration: 300 });
    }
  } finally {
    if (isQuerySource) {
      canvas.updateNodeData<QueryData>(sourceNode.id, { isRunning: false });
    }
  }
}
