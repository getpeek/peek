import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { toCsv } from "../../../tools/export/csv";
import { toJson } from "../../../tools/export/json";
import type { DatabaseResult } from "../../../state";

export async function exportRows(
  rows: DatabaseResult,
  format: "csv" | "json",
  defaultName: string,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const path = await save({
    defaultPath: `${defaultName}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (!path) {
    return;
  }
  const output = format === "csv" ? toCsv(rows) : JSON.stringify(toJson(rows), null, 2);
  await writeTextFile(path, output);
}
