export type Reference = { table: string; column: string };
export type ColumnRoles = { isPk: boolean; isFk: boolean };

const PK_COLUMN_PATTERN = /^id$/i;
const FK_COLUMN_PATTERN = /_id$/i;

export function classifyColumn(
  column: string,
  columnIdx: number,
  inbound: Reference[] | undefined,
  outbound: Reference[] | undefined,
): ColumnRoles {
  const hasInbound = (inbound?.length ?? 0) > 0;
  const hasOutbound = (outbound?.length ?? 0) > 0;
  const looksLikePk = PK_COLUMN_PATTERN.test(column);
  const looksLikeFk = FK_COLUMN_PATTERN.test(column);
  const isFirstColumnFk = columnIdx === 0 && looksLikeFk;
  const isPk = hasInbound || looksLikePk || isFirstColumnFk;
  const isFk = !isPk && (hasOutbound || looksLikeFk);
  return { isPk, isFk };
}
