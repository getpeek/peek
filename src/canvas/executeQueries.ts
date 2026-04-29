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

export type ExecuteQueriesArgs = {
  canvas: CanvasApi;
  setResults: SetResults;
  sourceNode: AppNode;
  queries: string[];
};

type Variables = ReturnType<typeof collectVariablesFor>;

type RunOneQueryArgs = {
  canvas: CanvasApi;
  setResults: SetResults;
  sourceNode: AppNode;
  query: string;
  index: number;
  totalQueries: number;
  variables: Variables;
  previousNodeId: string | null;
};

const RESULT_NODE_GAP = 50;
const DEFAULT_SOURCE_WIDTH = 350;
const DEFAULT_SOURCE_HEIGHT = 240;
const DEFAULT_RESULT_HEIGHT = 440;
const EMPTY_RESULT_WIDTH = 400;
const EMPTY_RESULT_HEIGHT = 600;
const RESULT_COLUMN_WIDTH = 250;
const MIN_RESULT_WIDTH = 200;
const RESULT_ROW_HEIGHT = 50;
const RESULT_HEIGHT_PADDING = 140;
const MAX_RESULT_HEIGHT = 1500;
const ERROR_NODE_WIDTH = 400;
const ERROR_NODE_HEIGHT = 300;
const ZOOM_DURATION_MS = 300;

function nextPosition(
  canvas: CanvasApi,
  sourceNode: AppNode,
  previousNodeId: string | null,
): { x: number; y: number } {
  const defaultX =
    sourceNode.position.x + (sourceNode.width ?? DEFAULT_SOURCE_WIDTH) + RESULT_NODE_GAP;
  if (!previousNodeId) {
    return { x: defaultX, y: sourceNode.position.y };
  }
  const previous = canvas.getNode(previousNodeId);
  if (!previous) {
    return { x: defaultX, y: sourceNode.position.y };
  }
  return {
    x: previous.position.x,
    y: previous.position.y + (previous.height ?? DEFAULT_RESULT_HEIGHT) + RESULT_NODE_GAP,
  };
}

function resultNodeDimensions(result: DatabaseResult): { width: number; height: number } {
  if (result.length === 0) {
    return { width: EMPTY_RESULT_WIDTH, height: EMPTY_RESULT_HEIGHT };
  }
  const columnCount = result[0]?.length ?? 0;
  return {
    width: Math.max(columnCount * RESULT_COLUMN_WIDTH, MIN_RESULT_WIDTH),
    height: Math.min(result.length * RESULT_ROW_HEIGHT + RESULT_HEIGHT_PADDING, MAX_RESULT_HEIGHT),
  };
}

async function runOneQuery(args: RunOneQueryArgs): Promise<string | null> {
  const { canvas, setResults, sourceNode, query, index, totalQueries, variables, previousNodeId } =
    args;

  const { resolved, missing } = substituteVariables(query, variables);
  if (missing.length > 0) {
    throw new Error(`Undefined variables: ${missing.map(name => "@" + name).join(", ")}`);
  }

  const response = (await invoke("get_results", { query: resolved })) as string;
  const result = JSON.parse(response) as DatabaseResult;

  if (totalQueries > 1 && result.length === 0) {
    return null;
  }

  const resultNodeId = ids.result(sourceNode.id, index);
  const errorNodeId = ids.error(sourceNode.id);

  setResults(prev => ({ ...prev, [resultNodeId]: result }));

  const existingResult = canvas.getNode(resultNodeId);
  if (existingResult) {
    canvas.updateNode(
      resultNodeId,
      node => ({ ...node, data: { ...(node.data as ResultData), query } }) as AppNode,
    );
  } else {
    const { x, y } = nextPosition(canvas, sourceNode, previousNodeId);
    const { width, height } = resultNodeDimensions(result);
    const newNode: ResultNode = {
      id: resultNodeId,
      type: "result",
      position: { x, y },
      width,
      height,
      data: { query },
    };
    canvas.addNode(newNode);
    canvas.connect(sourceNode.id, resultNodeId);
  }

  if (canvas.getNode(errorNodeId)) {
    canvas.deleteNode(errorNodeId);
  }

  return existingResult ? null : resultNodeId;
}

function recordQueryError(
  canvas: CanvasApi,
  sourceNode: AppNode,
  query: string,
  error: unknown,
): string | null {
  const errorNodeId = ids.error(sourceNode.id);
  const errorData: ErrorData = {
    queryNodeId: sourceNode.id,
    query,
    message: `${error}`,
  };

  const existing = canvas.getNode(errorNodeId);
  if (existing) {
    canvas.updateNode(errorNodeId, node => ({ ...node, data: errorData }) as AppNode);
    return null;
  }

  const errorY =
    sourceNode.position.y + (sourceNode.height ?? DEFAULT_SOURCE_HEIGHT) + RESULT_NODE_GAP;
  const errorNode: QueryErrorNode = {
    id: errorNodeId,
    type: "query-error",
    position: { x: sourceNode.position.x, y: errorY },
    width: ERROR_NODE_WIDTH,
    height: ERROR_NODE_HEIGHT,
    data: errorData,
  };
  canvas.addNode(errorNode);
  canvas.connect(errorNodeId, sourceNode.id);
  return errorNodeId;
}

function focusCreated(canvas: CanvasApi, createdIds: string[]): void {
  if (createdIds.length === 0) {
    return;
  }
  if (createdIds.length === 1) {
    canvas.selectOnly(createdIds[0]);
    canvas.zoomToNode(createdIds[0], { duration: ZOOM_DURATION_MS });
    return;
  }
  canvas.selectOnly(createdIds);
  canvas.zoomToNodes(createdIds, { duration: ZOOM_DURATION_MS });
}

export async function executeQueries({
  canvas,
  setResults,
  sourceNode,
  queries,
}: ExecuteQueriesArgs): Promise<void> {
  const variables = collectVariablesFor(canvas, sourceNode.id);
  const isQuerySource = sourceNode.type === "query";

  if (isQuerySource) {
    canvas.updateNodeData<QueryData>(sourceNode.id, { isRunning: true });
  }

  const createdIds: string[] = [];
  let previousNodeId: string | null = null;

  try {
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];
      try {
        const createdId = await runOneQuery({
          canvas,
          setResults,
          sourceNode,
          query,
          index,
          totalQueries: queries.length,
          variables,
          previousNodeId,
        });
        if (!createdId) {
          continue;
        }
        createdIds.push(createdId);
        previousNodeId = createdId;
      } catch (error) {
        const errorId = recordQueryError(canvas, sourceNode, query, error);
        if (errorId) {
          createdIds.push(errorId);
        }
      }
    }
    focusCreated(canvas, createdIds);
  } finally {
    if (isQuerySource) {
      canvas.updateNodeData<QueryData>(sourceNode.id, { isRunning: false });
    }
  }
}
