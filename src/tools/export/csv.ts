import { DatabaseResult } from "../../state";

function toCell(value: unknown): string {
  const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
  // Double inner quotes so JSON payloads don't terminate the CSV field early.
  return `"${text.replaceAll('"', '""')}"`;
}

export const toCsv = (result: DatabaseResult): string => {
  const headers = result[0].map(([key]) => key);
  const rows = result.map(row => row.map(([, value]) => toCell(value)));

  return [headers, ...rows].map(row => row.join(";")).join("\n");
};
