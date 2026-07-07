import type { Node, Edge } from "@xyflow/react";
import type { Message } from "./hooks/useExecutePrompt";

export type AppNodeType =
  | "query"
  | "result"
  | "result-insert-form"
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
  pivoted?: boolean;
  /** Node size before pivoting, restored when toggling pivot back off. */
  prePivotSize?: { width: number; height: number };
};

export type ResultInsertFormData = {
  // The result node this form inserts into. Everything else (table, columns,
  // variables, refresh) is derived live from it, so the form holds no snapshot.
  resultNodeId: string;
  // Optional per-column seed values (display strings) for the "duplicate row" flow.
  initialValues?: Record<string, string>;
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
export type ResultInsertFormNode = Node<ResultInsertFormData, "result-insert-form">;
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
  | ResultInsertFormNode
  | AgentNode
  | BarChartNode
  | QueryErrorNode
  | TableDefinitionNode
  | TextNode
  | VariableNode
  | DrawNode;

export type AppEdge = Edge;

export type RegionStatus = "confirmed" | "suggested";

export type RegionState = {
  id: string;
  name: string;
  desc: string;
  /** Index into the --pk-region-N theme tokens, so regions recolor with the theme. */
  colorIndex: number;
  status: RegionStatus;
  /** Node ids; members may since have been deleted — filter against live nodes when deriving. */
  memberIds: string[];
};

export type Viewport = { x: number; y: number; zoom: number };

export type PageState = {
  id: string;
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  viewport: Viewport;
  regions?: RegionState[];
};

export type CanvasDocument = {
  version: 1;
  activePageId: string;
  pageOrder: string[];
  pages: Record<string, PageState>;
};
