export type TypeCategory =
  | "numeric"
  | "text"
  | "boolean"
  | "datetime"
  | "json"
  | "uuid"
  | "binary"
  | "other";

const NUMERIC = [
  "int",
  "int2",
  "int4",
  "int8",
  "smallint",
  "bigint",
  "tinyint",
  "mediumint",
  "serial",
  "bigserial",
  "smallserial",
  "float",
  "float4",
  "float8",
  "double",
  "real",
  "decimal",
  "numeric",
  "money",
];

const TEXT = ["text", "varchar", "char", "citext", "name", "bpchar", "string"];
const BOOLEAN = ["bool", "boolean"];
const DATETIME = ["timestamp", "timestamptz", "date", "time", "timetz", "interval", "datetime"];
const JSON_TYPES = ["json", "jsonb"];
const UUID = ["uuid"];
const BINARY = ["bytea", "blob"];

function matches(type: string, list: string[]): boolean {
  return list.some(t => type === t || type.startsWith(`${t}(`));
}

export function categorizeType(rawType: string): TypeCategory {
  const type = rawType.trim().toLowerCase();
  if (matches(type, NUMERIC)) {
    return "numeric";
  }
  if (matches(type, TEXT)) {
    return "text";
  }
  if (matches(type, BOOLEAN)) {
    return "boolean";
  }
  if (matches(type, DATETIME)) {
    return "datetime";
  }
  if (matches(type, JSON_TYPES)) {
    return "json";
  }
  if (matches(type, UUID)) {
    return "uuid";
  }
  if (matches(type, BINARY)) {
    return "binary";
  }
  return "other";
}
