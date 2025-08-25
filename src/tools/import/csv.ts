import { ImportedDataResult } from "../../state";

export const fromCsv = (csv: string): ImportedDataResult => {
  const lines = csv.split("\n");
  const delimiter = lines[0].includes(",") ? "," : ";";

  const headers = lines[0].split(delimiter);
  return lines
    .slice(1)
    .filter((line) => line.length > 0)
    .map((line) => line.split(delimiter, headers.length))
    .map((row) => row.map((cell, i) => [headers[i], cell.replaceAll('"', "")]));
};
