import { serializeRows, type ExportFormat } from "./serializeRows";
import type { DatabaseResult } from "../../../state";

export async function copyRows(
  rows: DatabaseResult,
  format: ExportFormat,
  tableName?: string,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await navigator.clipboard.writeText(serializeRows(rows, format, tableName));
}
