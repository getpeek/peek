import type { QueryInfo } from "./queryInfo";

export type CellReference = { table: string; column: string };

export function getInboundReferences(
  info: QueryInfo | null,
  schema: Record<string, string[]>,
  column: string,
): CellReference[] {
  if (!info || info.statementType !== "select") {
    return [];
  }

  const tables = info.tables.map(t => t.name);

  return tables.flatMap(table => {
    return (schema[`${table}.${column}`] ?? []).map(ref => {
      const [to_table, to_col] = ref.split(".");
      return { table: to_table, column: to_col };
    });
  });
}

export function getOutboundReferences(
  info: QueryInfo | null,
  schema: Record<string, string[]>,
  column: string,
): CellReference[] {
  if (!info || info.statementType !== "select") {
    return [];
  }

  const tables = info.tables.map(t => t.name);
  const currentTableColumn = tables.map(table => `${table}.${column}`);

  return Object.entries(schema).flatMap(([key, refs]) => {
    return refs
      .filter(ref => currentTableColumn.includes(ref))
      .map(() => {
        const [from_table, from_col] = key.split(".");
        return { table: from_table, column: from_col };
      });
  });
}
