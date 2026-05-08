const NUMERIC_TYPES = [
  "int",
  "integer",
  "smallint",
  "bigint",
  "tinyint",
  "mediumint",
  "decimal",
  "numeric",
  "float",
  "double",
  "real",
  "money",
  "serial",
  "bigserial",
];

const BOOLEAN_TYPES = ["bool", "boolean"];

function classifyType(columnType: string): "numeric" | "boolean" | "text" {
  const lower = columnType.toLowerCase();
  if (BOOLEAN_TYPES.some(t => lower === t || lower.startsWith(t))) {
    return "boolean";
  }
  if (NUMERIC_TYPES.some(t => lower === t || lower.startsWith(t))) {
    return "numeric";
  }
  return "text";
}

export function formatSqlLiteral(value: unknown, columnType: string): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  const kind = classifyType(columnType);

  if (kind === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (kind === "numeric") {
    if (typeof value === "number" || typeof value === "bigint") {
      return String(value);
    }
    const asString = String(value).trim();
    return asString === "" ? "NULL" : asString;
  }

  const asString = typeof value === "string" ? value : String(value);
  return `'${asString.replaceAll("'", "''")}'`;
}
