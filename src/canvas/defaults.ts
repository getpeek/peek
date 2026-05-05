import { sha1 } from "object-hash";
import type { AppNode, AppNodeType } from "./types";
import { ids } from "./ids";

const SYSTEM_PROMPT = `/no_think You are an expert database engineer and assistant.

Your role is to help the user analyze SQL query results and provide insights using the provided data, query, and database schema.

You have access to the following tools:

1. **branchToNewConversation** — Use this **only** when the user **explicitly** asks you to create a **new PostgreSQL query** to branch out from the current conversation. Do not use this tool for analysis, explanation, or answering questions.

2. **getAdditionalContext** — Use this when you need **more data** to complete your analysis, or when the user asks for more data. You may call this tool freely when needed.

If the user asks a vague or open-ended question, ask a clarifying question, such as if they want you to create a new query or pull in additional context, before taking any action.

Always prioritize direct answers, summaries, or reasoning over tool use — unless tool usage is clearly necessary.
You can help guide the user by suggesting deeper analysis by factoring in the database schema, query and result set to find causes and trends that the user might not have considered in the original query.

Only call a tool **once per request**, unless the user specifies otherwise.`;

export const defaultDimensions: Record<AppNodeType, { w: number; h: number }> = {
  query: { w: 350, h: 240 },
  result: { w: 600, h: 440 },
  "ai-prompt": { w: 350, h: 240 },
  chat: { w: 540, h: 400 },
  barchart: { w: 460, h: 290 },
  "query-error": { w: 400, h: 300 },
  "table-definition": { w: 450, h: 280 },
  text: { w: 280, h: 140 },
  variable: { w: 280, h: 220 },
  draw: { w: 100, h: 100 },
};

export function makeNode(type: AppNodeType, position: { x: number; y: number }): AppNode {
  const { w, h } = defaultDimensions[type];
  const base = { position, width: w, height: h };

  switch (type) {
    case "query":
      return {
        ...base,
        id: ids.query(),
        type: "query",
        data: { query: "" },
      };
    case "ai-prompt":
      return {
        ...base,
        id: ids.ai(),
        type: "ai-prompt",
        data: { prompt: "", isLoading: false, reason: "" },
      };
    case "result":
      return {
        ...base,
        id: ids.result(ids.query()),
        type: "result",
        data: { query: "" },
      };
    case "chat":
      return {
        ...base,
        id: ids.chat(ids.query()),
        type: "chat",
        data: {
          query: "",
          messages: [
            {
              type: "system",
              message: SYSTEM_PROMPT,
              contextKey: sha1("systemprompt"),
              timestamp: Date.now(),
            },
          ],
        },
      };
    case "barchart":
      return {
        ...base,
        id: ids.chart(ids.query()),
        type: "barchart",
        data: { data: [], chartType: "bar" },
      };
    case "query-error":
      return {
        ...base,
        id: ids.error(ids.query()),
        type: "query-error",
        data: { queryNodeId: "", query: "", message: "" },
      };
    case "table-definition":
      return {
        ...base,
        id: ids.query(),
        type: "table-definition",
        data: { table: "", columns: [] },
      };
    case "text":
      return {
        ...base,
        id: ids.text(),
        type: "text",
        data: { text: "" },
      };
    case "variable":
      return {
        ...base,
        id: ids.variable(),
        type: "variable",
        data: { rows: [{ name: "", value: "" }] },
      };
    case "draw":
      return {
        ...base,
        id: ids.draw(),
        type: "draw",
        data: { points: [], strokeWidth: 4, color: "white" },
      };
  }
}
