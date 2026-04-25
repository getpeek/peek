import type { AST } from "node-sql-parser";

type FromEntry = {
  db?: string | null;
  table?: string | null;
  as?: string | null;
  join?: string | null;
};

export function getEditableTableName(ast: AST | null | undefined): string | null {
  if (!ast || typeof ast !== "object") return null;
  const a = ast as { type?: string; from?: FromEntry[] | null };
  if (a.type !== "select") return null;
  const from = a.from;
  if (!Array.isArray(from) || from.length !== 1) return null;
  const entry = from[0];
  if (!entry || !entry.table) return null;
  if (entry.join) return null;
  return entry.table;
}

export function formatSqlLiteral(value: unknown, sqlType: string): string {
  if (value === null || value === undefined) return "NULL";

  const upper = sqlType.toUpperCase();

  if (upper === "BOOL" || upper === "BOOLEAN") {
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    const s = String(value).toLowerCase();
    if (s === "true" || s === "t" || s === "1") return "TRUE";
    if (s === "false" || s === "f" || s === "0") return "FALSE";
    return "NULL";
  }

  if (upper === "JSON" || upper === "JSONB") {
    const json = typeof value === "string" ? value : JSON.stringify(value);
    const escaped = json.replace(/'/g, "''");
    return upper === "JSONB" ? `'${escaped}'::jsonb` : `'${escaped}'::json`;
  }

  if (
    upper === "INT2" ||
    upper === "INT4" ||
    upper === "INT8" ||
    upper === "INT" ||
    upper === "SMALLINT" ||
    upper === "MEDIUMINT" ||
    upper === "BIGINT" ||
    upper === "TINYINT" ||
    upper === "FLOAT4" ||
    upper === "FLOAT8" ||
    upper === "FLOAT" ||
    upper === "DOUBLE" ||
    upper === "DECIMAL" ||
    upper === "NUMERIC"
  ) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) {
      throw new Error(`"${String(value)}" is not a valid ${sqlType} value`);
    }
    return String(n);
  }

  const s = typeof value === "string" ? value : String(value);
  const escaped = s.replace(/'/g, "''");
  return `'${escaped}'`;
}

export type PkAssignment = { column: string; literal: string };

export function buildUpdateSql(
  table: string,
  column: string,
  newLiteral: string,
  pks: PkAssignment[],
): string {
  if (pks.length === 0) {
    throw new Error("buildUpdateSql requires at least one primary key column");
  }
  const where = pks
    .map((pk) => `"${pk.column}" = ${pk.literal}`)
    .join(" AND ");
  return `UPDATE "${table}" SET "${column}" = ${newLiteral} WHERE ${where}`;
}

export function buildPkAssignments(
  row: [string, unknown, string][],
  pkColumns: string[],
): PkAssignment[] | null {
  const byName = new Map<string, [unknown, string]>();
  for (const [name, value, type] of row) byName.set(name, [value, type]);
  const out: PkAssignment[] = [];
  for (const pk of pkColumns) {
    const cell = byName.get(pk);
    if (!cell) return null;
    out.push({ column: pk, literal: formatSqlLiteral(cell[0], cell[1]) });
  }
  return out;
}
