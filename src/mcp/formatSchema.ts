import type { Schema } from "../state";

// Verbose canonical type names cost several tokens each and repeat across every
// column; map them to their standard short aliases. Exact-match only, so
// parametrized types (numeric(10,2), varchar(255)) pass through untouched.
const TYPE_ALIASES: Record<string, string> = {
  "timestamp without time zone": "timestamp",
  "timestamp with time zone": "timestamptz",
  "time without time zone": "time",
  "time with time zone": "timetz",
  "character varying": "varchar",
  "double precision": "float8",
  integer: "int4",
  bigint: "int8",
  smallint: "int2",
  boolean: "bool",
};

function abbreviateType(type: string): string {
  return TYPE_ALIASES[type.toLowerCase()] ?? type;
}

// `references` is an inverted FK index (referenced "table.col" → referencing
// "table.col"[]), and only Postgres populates it that way — MySQL puts a
// table → column-names map in the same slot. Invert to a forward lookup
// (referencing "table.col" → referenced "table.col"), keeping only dotted-on-
// both-sides entries so MySQL's column map is ignored rather than mis-rendered.
function forwardForeignKeys(references: Schema["references"]): Map<string, string> {
  const forward = new Map<string, string>();
  for (const [referenced, referencing] of Object.entries(references)) {
    if (!referenced.includes(".")) {
      continue;
    }
    for (const source of referencing) {
      if (source.includes(".")) {
        forward.set(source, referenced);
      }
    }
  }
  return forward;
}

// Render the schema as compact DDL — one line per table, PK/FK inline:
//   orders(id int4 PK, user_id int4 ->users.id, total numeric, created_at timestamp)
// Far fewer tokens than JSON and self-contained per table, so the model doesn't
// cross-reference separate maps. `tables` narrows output to the named tables.
export function formatSchema(schema: Schema, tables?: string[]): string {
  const forward = forwardForeignKeys(schema.references);
  const names = (tables ?? Object.keys(schema.tables))
    .filter(name => schema.tables[name])
    .toSorted();

  if (names.length === 0) {
    return "(no tables in schema)";
  }

  return names
    .map(table => {
      const primaryKeys = new Set(schema.primaryKeys[table] ?? []);
      const columns = schema.tables[table]
        .map(([column, type]) => {
          const pk = primaryKeys.has(column) ? " PK" : "";
          const fk = forward.get(`${table}.${column}`);
          return `${column} ${abbreviateType(type)}${pk}${fk ? ` ->${fk}` : ""}`;
        })
        .join(", ");
      return `${table}(${columns})`;
    })
    .join("\n");
}
