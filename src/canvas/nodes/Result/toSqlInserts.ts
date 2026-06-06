import { buildInsertSql, formatSqlLiteral, type InsertAssignment } from "./inlineEdit";
import type { DatabaseResult } from "../../../state";

export function toSqlInserts(result: DatabaseResult, table: string): string {
  return result
    .map(row => {
      const assignments: InsertAssignment[] = row.map(([column, value, type]) => ({
        column,
        literal: formatSqlLiteral(value, type),
      }));
      return `${buildInsertSql(table, assignments)};`;
    })
    .join("\n");
}
