import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { serializeRows, type SerializeRowsOptions } from "./serializeRows";

export async function exportRows({
  defaultName,
  ...serialize
}: SerializeRowsOptions & { defaultName: string }): Promise<void> {
  if (serialize.rows.length === 0) {
    return;
  }
  const { format } = serialize;
  const path = await save({
    defaultPath: `${defaultName}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (!path) {
    return;
  }
  await writeTextFile(path, serializeRows(serialize));
}
