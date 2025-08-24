import { ImportedDataResult } from "../../state";

export const fromJson = (jsonString: string): ImportedDataResult => {
  const headers = new Set<string>();
  const output: ImportedDataResult = [];
  try {
    const data: Record<string, unknown>[] = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      return output;
    }

    for (const row of data) {
      Object.keys(row).forEach((key) => headers.add(key));
    }

    for (const row of data) {
      const rowData = Object.entries(row).map(
        ([key, value]) => [key, value] as [string, unknown],
      );
      output.push(rowData);
    }

    return output;
  } catch {
    return [];
  }
};
