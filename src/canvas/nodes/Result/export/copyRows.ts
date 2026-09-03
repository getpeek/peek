import { serializeRows, type SerializeRowsOptions } from "./serializeRows";

export async function copyRows(options: SerializeRowsOptions): Promise<void> {
  if (options.rows.length === 0) {
    return;
  }
  await navigator.clipboard.writeText(serializeRows(options));
}
