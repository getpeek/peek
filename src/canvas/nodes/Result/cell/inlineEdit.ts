import { quoteIdentifier, type Engine } from "../../../../Connection/engine";
import type { QueryInfo } from "../queryInfo";

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

export function isUuidType(sqlType: string): boolean {
  return sqlType.toUpperCase() === "UUID";
}

// Long-form types get a multiline editor; VARCHAR/CHAR stay single-line.
const TEXT_TYPES = new Set(["TEXT", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT"]);

export function isTextType(sqlType: string): boolean {
  return TEXT_TYPES.has(sqlType.toUpperCase());
}

const TIMESTAMP_TYPES = new Set(["TIMESTAMP", "TIMESTAMPTZ", "DATETIME"]);

export function isTimestampType(sqlType: string): boolean {
  return TIMESTAMP_TYPES.has(sqlType.toUpperCase());
}

export function formatSqlLiteral(value: unknown, sqlType: string, engine: Engine): string {
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
    const quoted = `'${json.replaceAll("'", "''")}'`;
    // MySQL has no cast syntax here and accepts a plain string literal for JSON columns.
    if (engine === "mysql") {
      return quoted;
    }
    return upper === "JSONB" ? `${quoted}::jsonb` : `${quoted}::json`;
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

export function buildUpdateSql({
  engine,
  table,
  column,
  newLiteral,
  pks,
}: {
  engine: Engine;
  table: string;
  column: string;
  newLiteral: string;
  pks: PkAssignment[];
}): string {
  if (pks.length === 0) {
    throw new Error("buildUpdateSql requires at least one primary key column");
  }
  const quote = (name: string) => quoteIdentifier(engine, name);
  const where = pks.map(pk => `${quote(pk.column)} = ${pk.literal}`).join(" AND ");
  return `UPDATE ${quote(table)} SET ${quote(column)} = ${newLiteral} WHERE ${where}`;
}

export function buildDeleteSql({
  engine,
  table,
  pkColumns,
  rows,
}: {
  engine: Engine;
  table: string;
  pkColumns: string[];
  rows: PkAssignment[][];
}): string {
  if (pkColumns.length === 0) {
    throw new Error("buildDeleteSql requires at least one primary key column");
  }
  if (rows.length === 0) {
    throw new Error("buildDeleteSql requires at least one row");
  }
  const quote = (name: string) => quoteIdentifier(engine, name);

  if (pkColumns.length === 1) {
    const col = pkColumns[0];
    const literals = rows.map(row => {
      const cell = row.find(pk => pk.column === col);
      if (!cell) {
        throw new Error(`Row missing primary key column "${col}"`);
      }
      return cell.literal;
    });
    return `DELETE FROM ${quote(table)} WHERE ${quote(col)} IN (${literals.join(", ")})`;
  }

  const colTuple = pkColumns.map(col => quote(col)).join(", ");
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
  return `DELETE FROM ${quote(table)} WHERE (${colTuple}) IN (${valueTuples.join(", ")})`;
}

export function buildInsertSql({
  engine,
  table,
  assignments,
}: {
  engine: Engine;
  table: string;
  assignments: InsertAssignment[];
}): string {
  if (assignments.length === 0) {
    throw new Error("buildInsertSql requires at least one column");
  }
  const cols = assignments.map(a => quoteIdentifier(engine, a.column)).join(", ");
  const vals = assignments.map(a => a.literal).join(", ");
  return `INSERT INTO ${quoteIdentifier(engine, table)} (${cols}) VALUES (${vals})`;
}

export function buildPkAssignments(
  row: [string, unknown, string][],
  pkColumns: string[],
  engine: Engine,
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
    out.push({ column: pk, literal: formatSqlLiteral(cell[0], cell[1], engine) });
  }
  return out;
}
