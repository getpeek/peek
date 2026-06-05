import { serializeRows } from "./serializeRows";
import type { DatabaseResult } from "../../../state";

export async function copyRows(rows: DatabaseResult, format: "csv" | "json"): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await navigator.clipboard.writeText(serializeRows(rows, format));
}
