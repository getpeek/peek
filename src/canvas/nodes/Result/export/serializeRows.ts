import { toCsv } from "../../../../tools/export/csv";
import { toJson } from "../../../../tools/export/json";
import { toSqlInserts } from "../toSqlInserts";
import type { Engine } from "../../../../Connection/engine";
import type { DatabaseResult } from "../../../../state";

export type ExportFormat = "csv" | "json" | "sql";

export type SerializeRowsOptions = {
  rows: DatabaseResult;
  format: ExportFormat;
  engine: Engine;
  tableName?: string;
};

export function serializeRows({
  rows,
  format,
  engine,
  tableName = "exported_data",
}: SerializeRowsOptions): string {
  switch (format) {
    case "csv":
      return toCsv(rows);
    case "json":
      return JSON.stringify(toJson(rows), null, 2);
    case "sql":
      return toSqlInserts({ rows, table: tableName, engine });
  }
}
