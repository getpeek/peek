import { ImportedDataResult } from "../../state";

export const fromCsv = (csv: string): ImportedDataResult => {
  const lines = csv.split("\n");
  const commaIndex = lines[0].indexOf(",");
  const delimiter = commaIndex !== -1 ? "," : ";";

  const headers = lines[0].split(delimiter);
  return lines
    .slice(1)
    .map((line) => line.split(delimiter))
    .map((row) => row.map((cell, i) => [headers[i], cell.replaceAll('"', "")]));
};
