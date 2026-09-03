# Database drivers

Peek supports one live database connection at a time. Everything engine-specific sits
behind two seams: the `Database` trait in Rust, which owns all I/O, and the `Engine`
value on the frontend, which decides dialect. This document is the reference for both —
what a driver must provide, what the rest of the app assumes it gets back, and what to
decide when an engine doesn't look like PostgreSQL.

Implemented today: PostgreSQL (`src-tauri/src/database/postgres.rs`) and MySQL/MariaDB
(`src-tauri/src/database/mysql.rs`).

## The two seams

| Concern                                          | Lives in                                          |
| ------------------------------------------------ | ------------------------------------------------- |
| Connecting, querying, schema reads, file imports | `Database` trait, `src-tauri/src/database/mod.rs` |
| Dialect: quoting, formatter, prompt wording      | `Engine`, `src/Connection/engine.ts`              |
| Running-query inspection and kill                | `ActivityEngine`, `src/canvas/nodes/Activity/`    |

Nothing else in the app should branch on the engine. When you find yourself adding a
third `if (engine === …)` outside those files, add a field to one of the two descriptors
instead.

## Rust: the `Database` trait

`AppData.connection: Option<Box<dyn Database>>` (`src-tauri/src/lib.rs`) holds the single
live connection. Every Tauri command in `src-tauri/src/database_commands.rs` locks the
`AppData` mutex and calls one of four methods.

| Method               | Returns      | Contract                                                           |
| -------------------- | ------------ | ------------------------------------------------------------------ |
| `get_results(query)` | `Vec<Value>` | Run a query, return rows as cells. Empty vec for no rows.          |
| `execute(query)`     | `String`     | Run a statement whose rows don't matter. Both impls return `"ok"`. |
| `get_schema()`       | three maps   | See [Schema contract](#schema-contract).                           |
| `import_data(data)`  | `()`         | Load a parsed CSV/JSON file into a table.                          |

The trait is driver-agnostic. Both current implementations use `sqlx`, but nothing in the
trait or the commands requires it.

### The row shape

`get_results` returns one JSON array per row, and each cell is a three-element tuple:

```
[[ [column_name, value, column_type], … ], … ]
```

`column_type` is the driver's own type name as a string, uppercase by convention
(`"INT4"`, `"VARCHAR"`, `"UNSIGNED BIGINT"`). The frontend never parses it as anything
but a hint: `src/canvas/nodes/TableDefinition/columnType.ts` classifies it into one of
eight categories with a merged PostgreSQL + MySQL name list, and anything unrecognised
falls into `"other"` and renders as text. A new driver adding unfamiliar type names
degrades gracefully; add the names to that list to get proper alignment, colouring and
cell editors.

`value` must be JSON the frontend can render directly. Both drivers decode to native JSON
types where they can — numbers as numbers, booleans as booleans, JSON columns as parsed
objects — and fall back to strings. Two conventions worth keeping:

- **Timestamps are strings**, ISO-8601 (`%Y-%m-%dT%H:%M:%S`, or RFC 3339 when the type
  carries a zone). Not epoch numbers.
- **Binary is base64** (MySQL's BLOB family). Postgres currently lets `bytea` fall
  through its raw-bytes arm instead, which is an inconsistency, not a rule.

Fallback behaviour differs between the two impls and is worth knowing when you copy one:
Postgres decodes unknown types from raw bytes as UTF-8, so arrays, enums and ranges
arrive as their text representation; MySQL's fallback is `try_get::<String>`, which nulls
out anything not string-decodable.

Decimals arrive as strings on both engines (`rust_decimal` serialises that way). The
Result node's aggregate and summable-column detection accounts for that, so keep it.

### Connecting

`set_connection` (`src-tauri/src/lib.rs`) picks the implementation from the URL scheme:

- `postgres://`, `postgresql://` → `PostgresDatabase`
- `mysql://`, `mariadb://` → `MysqlDatabase`
- anything else → `Err("Unsupported database scheme …")`, shown in the connection picker

Rules a driver must follow:

1. **Connect eagerly.** A bad host or password fails `set_connection`, not the first
   query. MySQL used to store the URL and connect per call; that made credential errors
   surface minutes later and silently discarded temporary tables.
2. **Hold the connection open.** Session state — temporary tables, `SET`, the backend's
   own id — must survive across commands.
3. **Take the port from the URL,** and register a default in `default_port_for_scheme`
   for SSH tunnels. When a tunnel is configured the URL is rewritten to
   `127.0.0.1:<local port>` before the driver sees it, and that function supplies the
   remote port when the URL omits it.
4. **Reset the LSP schema cache** (`*schema_cache.write() = SchemaIndex::default()`).

There is no connection pool and no per-query cancellation. Every command serialises on
one mutex, so a long query blocks the rest of the app — including the activity node that
would show you the long query. Worth knowing before you design around it.

### Schema contract

`get_schema` returns `(tables, references, primary_keys)`, consumed unchanged by the LSP
(`SchemaIndex::from_raw`) and the frontend `schemaAtom`:

| Map            | Shape                                                         | Notes                                     |
| -------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `tables`       | `table → [(column, type)]`                                    | Bare table names; no schema qualification |
| `references`   | `"referenced_table.column" → ["referencing_table.column", …]` | **Inverted** foreign-key index            |
| `primary_keys` | `table → [column]`                                            | Ordinal order                             |

`references` being inverted is the easiest thing to get wrong. It is keyed by the
_target_ of the foreign key, and both sides must be `table.column` strings —
`SchemaIndex::from_raw` skips any key without a dot, and `src/mcp/formatSchema.ts`
inverts it back to a forward lookup for DDL rendering. Returning anything else in that
slot silently disables FK chips, the schema graph, reference-following and JOIN
completion. MySQL shipped a `table → columns` map there for a year, which is exactly how
we learned this.

Where the data comes from today: Postgres reads `information_schema` for the `public`
schema plus a `pg_class` union for temporary tables; MySQL filters on
`table_schema = DATABASE()` and reads foreign keys from `KEY_COLUMN_USAGE` rows whose
`REFERENCED_TABLE_NAME` is set.

Not modelled at all: multiple schemas or namespaces, views versus tables, enum types,
sequences, indexes and column comments. Table keys are bare names, so two same-named
tables in different schemas collide.

### Imports

`import_data` receives an `ImportedData { table_name, fields }` where `fields` is a row
list of `(column_name, ImportType)` pairs, with `ImportType` already sniffed by
`src-tauri/src/import/` into one of Uuid, Date, DateTime, Text, Number, Float, Boolean,
Json or Null. The driver maps those to its own column types and loads the rows.

Both impls create a `TEMPORARY` table named by `sanitize_table_name` and insert in chunks
of 500. Two things to carry over:

- **Escape literals per engine.** Postgres doubles `'`; MySQL also doubles `\`, because
  its default `sql_mode` treats backslash as an escape.
- **Keep imports visible in the schema.** The LSP and canvas only know about tables
  `get_schema` reports. Postgres finds temporary tables through `pg_class` with
  `relpersistence = 't'`. MySQL's `information_schema` never lists them, so
  `MysqlDatabase` remembers the names in `imported_tables` and describes each with
  `SHOW COLUMNS` during `get_schema`, skipping any that have disappeared.

Temporary tables live on the connection, which is the other reason a driver must hold one
open.

## Frontend: the `Engine` value

`Engine` is `"postgresql" | "mysql" | "unknown"` (`src/Connection/engine.ts`).
`engineFromUrl` derives it from the URL scheme alone, so credentials never leave the
connection store. `activeEngineAtom` resolves it for the current user: the active
connection's URL for a host, or `hostEngineAtom` for a multiplayer joiner. Non-React
callers use `getActiveEngine()`.

Three dialect helpers hang off it, each a `switch` where `"unknown"` keeps the historical
Postgres behaviour:

- `quoteIdentifier(engine, name)` — backticks for MySQL, double quotes otherwise, with
  escaping. Every identifier in generated DML goes through it.
- `formatterLanguage(engine)` — the `sql-formatter` dialect.
- `dialectName(engine)` — the human-readable name spliced into AI prompts.

Guests build SQL too. Desktop joiners and the peek-web client generate inline-edit,
delete and insert statements locally and send them to the host to run, so the host
publishes its engine under the `connection/engine` document key
(`CONNECTION_ENGINE_KEY`). `useSyncBridge` stores it in `hostEngineAtom`. The web client
mirrors the whole arrangement in `src/join/Connection/engine.ts`; when you add an engine,
update both files.

### The `ActivityEngine` descriptor

The running-queries node polls through a descriptor (`activitySql.ts`, with
`activitySql.postgres.ts` and `activitySql.mysql.ts` beside it):

```ts
interface ActivityEngine {
  sourceName: string; // footer label
  paletteDescription: string;
  pollSql(minSecs: number): string;
  sourceQuerySql(minSecs: number): string;
  killLabel(pid: number): string;
  kill(pid: number): Promise<boolean>;
}
```

The design rule that keeps this cheap: **each descriptor aliases its engine's columns
into one row shape** — the `pg_stat_activity` names that `activityRow.ts` parses — and
normalises `state` into `active` / `idle` / `idle in transaction`. MySQL selects from
`information_schema.PROCESSLIST` joined with `INNODB_TRX` and `sys.innodb_lock_waits`,
and maps `COMMAND = 'Sleep'` plus an open transaction to `idle in transaction`. Because
the shape matches, the filters, sorting, duration ticking, kill-and-linger flow and row
menu never branch on the engine.

Kill semantics differ and the descriptor absorbs that: Postgres returns `false` from
`pg_terminate_backend` when it won't terminate, while MySQL's `KILL` raises an error
instead. Both collapse into `Promise<boolean>` plus a thrown error.

### What the frontend assumes is SQL

These are the places that assume the query language is SQL, not just a particular
dialect. A relational driver inherits them for free; anything else has to confront them.

| Assumption                                                                                 | Where                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Monaco language is `sql`; completions come from a tree-sitter SQL parser                   | `Query/Editor/`, `src-tauri/crates/lsp/` (grammar: `tree-sitter-sequel`) |
| A query can be reformatted by `sql-formatter`                                              | `formatPreservingVars`, `src/canvas/variables.ts`                        |
| Live polling only re-runs statements starting with `select`                                | `isSelectOnly`, `Query/QueryNode.tsx`                                    |
| A statement has a type and a table list                                                    | `get_query_info` command → `queryInfo.ts`                                |
| Rows are editable when the query is a single-table `SELECT` and the table has primary keys | `getEditableTableName`, `columnRoles.ts`                                 |
| Edits are expressed as `UPDATE` / `DELETE` / `INSERT` with quoted identifiers              | `Result/cell/inlineEdit.ts`                                              |
| `DELETE` without `WHERE`, and `TRUNCATE`, are dangerous                                    | `isUnboundedWrite.ts`                                                    |
| The AI agent writes SQL, and errors are fixed by rewriting SQL                             | `Agent/agentTools.ts`, `QueryError/QueryErrorNode.tsx`                   |

The LSP is deliberately dialect-blind: one keyword table serves every engine, so
`ILIKE` and `RETURNING` are offered on MySQL. See `docs/lsp.md`.

## Adding a relational driver

1. Implement `Database` in `src-tauri/src/database/<engine>.rs`. Own an open connection,
   return the documented row shape, and produce all three schema maps — including the
   inverted `references` index and temporary-table visibility for imports.
2. Add a scheme branch in `set_connection` that connects eagerly, and a default port in
   `default_port_for_scheme`.
3. Extend `Engine` and `engineFromUrl` in `src/Connection/engine.ts`, plus the
   `quoteIdentifier`, `formatterLanguage` and `dialectName` switches. Mirror the type and
   the helpers in `src/join/Connection/engine.ts` for the web guest.
4. Add an `ActivityEngine` descriptor and return it from `activityEngineFor`.
5. Add the driver's type names to `TableDefinition/columnType.ts` so cells classify.
6. Update the connection form's hint and placeholder, and this document.

There are no automated tests for any of this — no test runner in the repo and no
integration harness. Verification is manual against a real server; `docs/releases.md`
has the shape of a release check.

## Beyond relational: what Redis would break

Not implemented. This section records which assumptions above stop holding, so the
design conversation starts from facts rather than a survey.

Redis fits the `Database` trait's _shape_ — a command string in, a table of cells out —
but almost none of the relational semantics layered on top. `sqlx` has no Redis support,
so it needs a new dependency (`redis-rs` or `fred`); the trait itself doesn't care.

**Maps cleanly**

- Connection: `redis://host:6379/0`, eager connect, one held connection. The numeric
  database in the URL path replaces the notion of a schema.
- `execute`: write commands (`SET`, `HSET`, `DEL`, `EXPIRE`) are a natural fit.
- Activity: `CLIENT LIST` yields id, addr, name, age, idle, cmd and `multi` (the count of
  commands queued in a `MULTI`, or -1). That aliases onto the existing activity row
  shape, `multi >= 0` is a genuine "idle in transaction", and `CLIENT KILL ID <id>` is
  the kill. There is no blocking graph to fill `blocked_by`. Caveat: Redis executes
  commands one at a time, so "a long-running query" mostly means a blocked client
  (`BLPOP`) or a slow command already finished — `SLOWLOG GET` is the more useful view,
  and it is historical rather than live.

**Needs a decision**

- **Result shape.** Replies are heterogeneous: scalars, arrays, nested arrays, hashes,
  sets, stream entries. Each needs a documented projection into rows and columns — a hash
  as field/value rows or as one wide row, a `SCAN` page as one key column, a stream entry
  as its fields. RESP3 distinguishes maps, sets and doubles natively; RESP2 flattens
  everything to strings, integers and arrays, which changes how much type information the
  driver can report as `column_type`.
- **Schema.** There are no tables, columns, primary keys or foreign keys. The closest
  analogue is key-prefix namespaces (`user:1234` → `user`) with `TYPE` per key and, for
  hashes, sampled field names as columns. That means a sampled `SCAN` with a count and
  time budget, driven by an explicit refresh rather than on every connect, and empty
  `references` and `primary_keys`. The alternative is returning empty maps and letting
  schema-dependent features go dark; either way the decision belongs in the driver, not
  scattered through the UI.
- **Row identity for editing.** Inline edit currently needs a single-table `SELECT` and
  primary keys, then writes `UPDATE`. Redis has a precise identity — the key, plus a hash
  field — but expressing it means generalising the builders in `Result/cell/inlineEdit.ts`
  from "table + PK columns" to a driver-supplied identity, or gating editing off entirely
  for non-relational engines.
- **Editor and language support.** The Monaco SQL mode, the SQL formatter and the
  tree-sitter SQL parser are all wrong for a command language. A command-aware completion
  source (command names, arity, key-prefix suggestions) is a separate piece of work, and
  `isSelectOnly` needs a per-engine notion of "safe to re-run" for live polling.
- **Imports.** `import_data` has no temporary-table equivalent. Loading a CSV would mean
  writing keys under a prefix, which is not scoped to a session and not undone by
  disconnecting — a different safety conversation from a temporary table.

**An opportunity, not a gap**

Live queries today are client-side polling on every engine. Redis keyspace notifications
(`notify-keyspace-events` plus a `__keyspace@0__:*` subscription) are genuine push, which
would make it the first engine where a live node could be event-driven. That would need a
streaming channel from Rust to the frontend, which the trait has no room for yet.

## Known gaps across all drivers

- No query cancellation. There is no cancel token and no statement timeout; the activity
  node's kill is the only way to stop a statement, and it terminates the whole backend.
- No transactions. Row edits are single autocommit statements.
- No `EXPLAIN` integration.
- One connection, one mutex, so the activity poll contends with user queries.
- Postgres is limited to the `public` schema.
- No dialect awareness in completions or diagnostics.
