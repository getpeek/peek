import { toCsv } from "../../../tools/export/csv";
import { toJson } from "../../../tools/export/json";
import { toSqlInserts } from "./toSqlInserts";
import type { DatabaseResult } from "../../../state";

export type ExportFormat = "csv" | "json" | "sql";

export function serializeRows(
  rows: DatabaseResult,
  format: ExportFormat,
  tableName = "exported_data",
): string {
  switch (format) {
    case "csv":
      return toCsv(rows);
    case "json":
      return JSON.stringify(toJson(rows), null, 2);
    case "sql":
      return toSqlInserts(rows, tableName);
  }
}
