import type { QueryInfo } from "./queryInfo";

export function getEditableTableName(info: QueryInfo | null | undefined): string | null {
  if (!info || info.statementType !== "select") {
    return null;
  }
  if (info.tables.length !== 1) {
    return null;
  }
  const table = info.tables[0];
  if (!table || table.isJoined) {
    return null;
  }
  return table.name;
}

// SQL exports need a target table even for joins/aggregates the user can't edit
// in place, so this falls back to the first base table and then a generic name.
export function getExportTableName(info: QueryInfo | null | undefined, fallback: string): string {
  const base = info?.tables.find(t => !t.isJoined) ?? info?.tables[0];
  return base?.name ?? fallback;
}

const NUMERIC_TYPES = new Set([
  "INT2",
  "INT4",
  "INT8",
  "INT",
  "SMALLINT",
  "MEDIUMINT",
  "BIGINT",
  "TINYINT",
  "FLOAT4",
  "FLOAT8",
  "FLOAT",
  "DOUBLE",
  "DECIMAL",
  "NUMERIC",
]);

export function isBooleanType(sqlType: string): boolean {
  const upper = sqlType.toUpperCase();
  return upper === "BOOL" || upper === "BOOLEAN";
}

export function isNumericType(sqlType: string): boolean {
  return NUMERIC_TYPES.has(sqlType.toUpperCase());
}

export function formatSqlLiteral(value: unknown, sqlType: string): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  const upper = sqlType.toUpperCase();

  if (isBooleanType(upper)) {
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    const s = String(value).toLowerCase();
    if (s === "true" || s === "t" || s === "1") {
      return "TRUE";
    }
    if (s === "false" || s === "f" || s === "0") {
      return "FALSE";
    }
    return "NULL";
  }

  if (upper === "JSON" || upper === "JSONB") {
    const json = typeof value === "string" ? value : JSON.stringify(value);
    const escaped = json.replaceAll("'", "''");
    return upper === "JSONB" ? `'${escaped}'::jsonb` : `'${escaped}'::json`;
  }

  if (isNumericType(upper)) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) {
      throw new TypeError(`"${String(value)}" is not a valid ${sqlType} value`);
    }
    return String(n);
  }

  const s = typeof value === "string" ? value : String(value);
  const escaped = s.replaceAll("'", "''");
  return `'${escaped}'`;
}

export type PkAssignment = { column: string; literal: string };
export type InsertAssignment = { column: string; literal: string };

export function buildUpdateSql(
  table: string,
  column: string,
  newLiteral: string,
  pks: PkAssignment[],
): string {
  if (pks.length === 0) {
    throw new Error("buildUpdateSql requires at least one primary key column");
  }
  const where = pks.map(pk => `"${pk.column}" = ${pk.literal}`).join(" AND ");
  return `UPDATE "${table}" SET "${column}" = ${newLiteral} WHERE ${where}`;
}

export function buildDeleteSql(table: string, pkColumns: string[], rows: PkAssignment[][]): string {
  if (pkColumns.length === 0) {
    throw new Error("buildDeleteSql requires at least one primary key column");
  }
  if (rows.length === 0) {
    throw new Error("buildDeleteSql requires at least one row");
  }

  if (pkColumns.length === 1) {
    const col = pkColumns[0];
    const literals = rows.map(row => {
      const cell = row.find(pk => pk.column === col);
      if (!cell) {
        throw new Error(`Row missing primary key column "${col}"`);
      }
      return cell.literal;
    });
    return `DELETE FROM "${table}" WHERE "${col}" IN (${literals.join(", ")})`;
  }

  const colTuple = pkColumns.map(col => `"${col}"`).join(", ");
  const valueTuples = rows.map(row => {
    const literals = pkColumns.map(col => {
      const cell = row.find(pk => pk.column === col);
      if (!cell) {
        throw new Error(`Row missing primary key column "${col}"`);
      }
      return cell.literal;
    });
    return `(${literals.join(", ")})`;
  });
  return `DELETE FROM "${table}" WHERE (${colTuple}) IN (${valueTuples.join(", ")})`;
}

export function buildInsertSql(table: string, assignments: InsertAssignment[]): string {
  if (assignments.length === 0) {
    throw new Error("buildInsertSql requires at least one column");
  }
  const cols = assignments.map(a => `"${a.column}"`).join(", ");
  const vals = assignments.map(a => a.literal).join(", ");
  return `INSERT INTO "${table}" (${cols}) VALUES (${vals})`;
}

export function buildPkAssignments(
  row: [string, unknown, string][],
  pkColumns: string[],
): PkAssignment[] | null {
  const byName = new Map<string, [unknown, string]>();
  for (const [name, value, type] of row) {
    byName.set(name, [value, type]);
  }
  const out: PkAssignment[] = [];
  for (const pk of pkColumns) {
    const cell = byName.get(pk);
    if (!cell) {
      return null;
    }
    out.push({ column: pk, literal: formatSqlLiteral(cell[0], cell[1]) });
  }
  return out;
}
