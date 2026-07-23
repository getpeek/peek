import type { AppNode, AppNodeType } from "../canvas/types";
import type { DatabaseResult } from "../state";
import { nodeHeading } from "../canvas/nodes/Result/queryHeading";
import { stringifyValue } from "../canvas/nodes/Result/stringify";

export type SearchableNodeType = Exclude<AppNodeType, "draw" | "result-insert-form">;

export interface NodeSearchEntry {
  id: string;
  type: SearchableNodeType;
  label: string;
  snippet: string;
  haystack: string;
  /** What the title is fuzzy-matched against — the same as `label`, except for result
   *  nodes whose title is their SQL: they match on their data, never the query. */
  titleMatch: string;
}

// Cells beyond this row count don't enter the haystack — enough to find a node
// by a value it displays without stringifying a 100k-row result on every keystroke.
// The fold-out's cell-match scan uses the same cap so preview and match agree.
export const MAX_SEARCHED_ROWS = 100;

const collapse = (text: string): string => text.replaceAll(/\s+/gu, " ").trim();

const title = (text: string): string => collapse(text).slice(0, 60);

// The searchable representation of one node: `label` is what the row shows, `titleMatch`
// is what the title is fuzzy-matched against (empty for result nodes so they match only on
// their data), and `haystack` is the node's other searchable content.
export function describeNode(node: AppNode, rows: DatabaseResult): NodeSearchEntry | null {
  const entry = baseEntry(node, rows);
  if (entry === null) {
    return null;
  }
  return { ...entry, titleMatch: entry.type === "result" ? "" : entry.label };
}

// Returns null for kinds with nothing meaningful to search (freehand strokes, insert forms).
function baseEntry(
  node: AppNode,
  rows: DatabaseResult,
): Omit<NodeSearchEntry, "titleMatch"> | null {
  switch (node.type) {
    case "query":
      return {
        id: node.id,
        type: node.type,
        label: node.data.description || nodeHeading(node.data.query),
        snippet: collapse(node.data.query),
        haystack: [node.data.description, node.data.query].filter(Boolean).join(" "),
      };
    case "result": {
      const columns = rows[0]?.map(([column]) => column) ?? [];
      const cells = rows
        .slice(0, MAX_SEARCHED_ROWS)
        .flatMap(row => row.map(([, value]) => stringifyValue(value)));
      return {
        id: node.id,
        type: node.type,
        label: nodeHeading(node.data.query),
        snippet: columns.length > 0 ? columns.join(" · ") : collapse(node.data.query),
        haystack: cells.join(" "),
      };
    }
    case "agent": {
      const chat = node.data.messages
        .filter(m => m.type === "user" || m.type === "assistant")
        .map(m => m.message);
      return {
        id: node.id,
        type: node.type,
        label: title(node.data.query),
        snippet: collapse(chat.at(-1) ?? node.data.query),
        haystack: [node.data.query, ...chat].join(" "),
      };
    }
    case "text":
      return {
        id: node.id,
        type: node.type,
        label: title(node.data.text),
        snippet: collapse(node.data.text),
        haystack: node.data.text,
      };
    case "variable": {
      const pairs = node.data.rows.map(
        row => `${row.name} = ${Array.isArray(row.value) ? row.value.join(", ") : row.value}`,
      );
      return {
        id: node.id,
        type: node.type,
        label: title(node.data.rows.map(row => row.name).join(", ")),
        snippet: collapse(pairs.join(" · ")),
        haystack: pairs.join(" "),
      };
    }
    case "table-definition": {
      const columns = node.data.columns.map(([name, columnType]) => `${name} ${columnType}`);
      return {
        id: node.id,
        type: node.type,
        label: node.data.table,
        snippet: collapse(node.data.columns.map(([name]) => name).join(" · ")),
        haystack: [node.data.table, ...columns].join(" "),
      };
    }
    case "query-error":
      return {
        id: node.id,
        type: node.type,
        label: title(node.data.message),
        snippet: collapse(node.data.query),
        haystack: `${node.data.message} ${node.data.query}`,
      };
    case "barchart": {
      const columns = Object.keys(node.data.data[0] ?? {});
      return {
        id: node.id,
        type: node.type,
        label: columns.length > 0 ? title(columns.join(" · ")) : "Chart",
        snippet: node.data.chartType ?? "bar",
        haystack: [...columns, node.data.chartType ?? "bar"].join(" "),
      };
    }
    default:
      return null;
  }
}
