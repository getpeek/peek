import type { DatabaseResult, Schema } from "../../../state";

// Vertical form: each field is a label + input block; the rest is node chrome
// (header, padding, footer). Used to pick a sensible default node height so a
// freshly spawned form shows all its fields without scrolling where possible.
const FIELD_BLOCK_HEIGHT = 66;
const FORM_CHROME_HEIGHT = 112;
const MIN_FORM_HEIGHT = 180;
const MAX_FORM_HEIGHT = 600;

export function estimateInsertFormHeight(fieldCount: number): number {
  const raw = FORM_CHROME_HEIGHT + Math.max(1, fieldCount) * FIELD_BLOCK_HEIGHT;
  return Math.max(MIN_FORM_HEIGHT, Math.min(MAX_FORM_HEIGHT, raw));
}

// Prefer the result's own projection (matches the SELECTed columns and their
// returned types); fall back to the table's full schema so inserting still works
// when the result has no rows yet.
export function deriveInsertColumns(
  rows: DatabaseResult,
  schema: Schema,
  table: string | null,
): { headers: string[]; columnTypes: Record<string, string> } {
  const firstRow = rows[0];
  if (firstRow && firstRow.length > 0) {
    const columnTypes: Record<string, string> = {};
    for (const [name, , type] of firstRow) {
      columnTypes[name] = type ?? "";
    }
    return { headers: firstRow.map(([name]) => name), columnTypes };
  }
  if (table && schema.tables[table]) {
    const columnTypes: Record<string, string> = {};
    for (const [name, type] of schema.tables[table]) {
      columnTypes[name] = type ?? "";
    }
    return { headers: schema.tables[table].map(([name]) => name), columnTypes };
  }
  return { headers: [], columnTypes: {} };
}
