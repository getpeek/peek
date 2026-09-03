import { buildInsertSql, formatSqlLiteral, type InsertAssignment } from "./cell/inlineEdit";
import type { Engine } from "../../../Connection/engine";
import type { DatabaseResult } from "../../../state";

export function toSqlInserts({
  rows,
  table,
  engine,
}: {
  rows: DatabaseResult;
  table: string;
  engine: Engine;
}): string {
  return rows
    .map(row => {
      const assignments: InsertAssignment[] = row.map(([column, value, type]) => ({
        column,
        literal: formatSqlLiteral(value, type, engine),
      }));
      return `${buildInsertSql({ engine, table, assignments })};`;
    })
    .join("\n");
}
