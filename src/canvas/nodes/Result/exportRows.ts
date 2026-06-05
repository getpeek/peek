import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { serializeRows } from "./serializeRows";
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
  await writeTextFile(path, serializeRows(rows, format));
}
