import { toCsv } from "../../../tools/export/csv";
import { toJson } from "../../../tools/export/json";
import type { DatabaseResult } from "../../../state";

export function serializeRows(rows: DatabaseResult, format: "csv" | "json"): string {
  return format === "csv" ? toCsv(rows) : JSON.stringify(toJson(rows), null, 2);
}
