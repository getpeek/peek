import type { AppNode, AppNodeType } from "./types";
import { ids } from "./ids";

export const defaultDimensions: Record<AppNodeType, { w: number; h: number }> = {
  query: { w: 350, h: 240 },
  result: { w: 600, h: 440 },
  agent: { w: 540, h: 400 },
  barchart: { w: 460, h: 290 },
  "query-error": { w: 400, h: 300 },
  "table-definition": { w: 450, h: 280 },
  text: { w: 280, h: 140 },
  variable: { w: 280, h: 220 },
  draw: { w: 100, h: 100 },
};

export const minDimensions: Record<AppNodeType, { w: number; h: number }> = {
  query: { w: 320, h: 200 },
  result: { w: 400, h: 260 },
  agent: { w: 400, h: 300 },
  barchart: { w: 300, h: 200 },
  "query-error": { w: 300, h: 200 },
  "table-definition": { w: 300, h: 140 },
  text: { w: 80, h: 32 },
  variable: { w: 220, h: 140 },
  draw: { w: 1, h: 1 },
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
    case "agent":
      return {
        ...base,
        id: ids.agent(),
        type: "agent",
        data: { query: "", messages: [] },
      };
    case "result":
      return {
        ...base,
        id: ids.result(ids.query()),
        type: "result",
        data: { query: "" },
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
