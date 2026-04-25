import type { Node, Edge } from "@xyflow/react";
import type { DatabaseResult } from "../state";
import type { Message } from "../shapes/Ai/useExecutePrompt";

export type AppNodeType =
  | "query"
  | "result"
  | "ai-prompt"
  | "chat"
  | "barchart"
  | "query-error";

export type QueryData = { query: string };

export type ResultData = {
  data: DatabaseResult;
  query: string;
  columnWidths?: Record<string, number>;
};

export type AiPromptData = {
  prompt: string;
  isLoading: boolean;
  reason: string;
};

export type ChatSchema = {
  tables: Record<string, string[]>;
  references: Record<string, string[]>;
};

export type ChatData = {
  query: string;
  result: DatabaseResult;
  schema: ChatSchema;
  messages: Message[];
};

export type BarChartData = {
  data: Record<string, string | number>[];
};

export type ErrorData = {
  queryNodeId: string;
  query: string;
  message: string;
};

export type QueryNode = Node<QueryData, "query">;
export type ResultNode = Node<ResultData, "result">;
export type AiPromptNode = Node<AiPromptData, "ai-prompt">;
export type ChatNode = Node<ChatData, "chat">;
export type BarChartNode = Node<BarChartData, "barchart">;
export type QueryErrorNode = Node<ErrorData, "query-error">;

export type AppNode =
  | QueryNode
  | ResultNode
  | AiPromptNode
  | ChatNode
  | BarChartNode
  | QueryErrorNode;

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
