import type { Node, Edge } from "@xyflow/react";
import type { Message } from "./hooks/useExecutePrompt";

export type AppNodeType =
  | "query"
  | "result"
  | "agent"
  | "barchart"
  | "query-error"
  | "table-definition"
  | "text"
  | "variable"
  | "draw";

export type QueryData = {
  query: string;
  liveIntervalMs?: number | null;
  isRunning?: boolean;
};

export type ResultData = {
  query: string;
  columnWidths?: Record<string, number>;
};

export type AgentData = {
  query: string;
  messages: Message[];
};

export type ChartType = "bar" | "line" | "area";

export type BarChartData = {
  data: Record<string, string | number>[];
  chartType?: ChartType;
};

export type ErrorData = {
  queryNodeId: string;
  query: string;
  message: string;
};

export type TableDefinitionData = {
  table: string;
  columns: [string, string][];
};

export type TextData = {
  text: string;
};

export type VariableRow = { name: string; value: string | string[] };

export type VariableData = {
  rows: VariableRow[];
  isGlobal?: boolean;
};

export type DrawPoint = [number, number, number];

export type DrawData = {
  points: DrawPoint[];
  strokeWidth: number;
  color: string;
};

export type QueryNode = Node<QueryData, "query">;
export type ResultNode = Node<ResultData, "result">;
export type AgentNode = Node<AgentData, "agent">;
export type BarChartNode = Node<BarChartData, "barchart">;
export type QueryErrorNode = Node<ErrorData, "query-error">;
export type TableDefinitionNode = Node<TableDefinitionData, "table-definition">;
export type TextNode = Node<TextData, "text">;
export type VariableNode = Node<VariableData, "variable">;
export type DrawNode = Node<DrawData, "draw">;

export type AppNode =
  | QueryNode
  | ResultNode
  | AgentNode
  | BarChartNode
  | QueryErrorNode
  | TableDefinitionNode
  | TextNode
  | VariableNode
  | DrawNode;

export type AppEdge = Edge;

export type Viewport = { x: number; y: number; zoom: number };

export type PageState = {
  id: string;
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  viewport: Viewport;
};

export type CanvasDocument = {
  version: 1;
  activePageId: string;
  pageOrder: string[];
  pages: Record<string, PageState>;
};
