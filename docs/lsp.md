# SQL LSP

Peek embeds a SQL language server in the Rust host (`src-tauri/src/lsp/`) and surfaces its results to the editor via the WASM bridge — there is no separate language-server process. Each query node owns a SQL document; on every keystroke the frontend calls `did_change`, then asks for `completion(uri, position)` and `diagnostics(uri)`. Completions feed Monaco's autocomplete; diagnostics drive the squigglies. The schema for the active connection is pushed in once and cached, so neither path issues database calls.

## Pipeline

A completion request flows through:

```
did_change(uri, text)
  → DocumentStore::upsert         (parse with tree-sitter, cache the Tree)

completion(uri, position)
  → position_to_byte_offset       (UTF-16 LSP Position → byte offset)
  → analyze_cursor                (Tree + source + offset → CursorContext)
  → Scope::collect                (tree → bound relations + aliases)
  → complete                      (context + scope + schema → CompletionItem[])
```

Entry points: `backend.rs:57` (`Backend::completion`), `context.rs:30` (`analyze_cursor`), `completion/mod.rs:13` (`complete`).

`did_change` is full-reparse on every edit. Tree-sitter is fast enough that incremental parsing isn't worth the bookkeeping yet; the hook for it is documented in `documents.rs:25`.

## Modules

- `backend.rs` — public surface. `Backend::new(schema)`, `did_change`, `did_close`, `completion`, `diagnostics`. Owns a `DocumentStore` and an `Arc<RwLock<SchemaIndex>>` shared with the rest of the host.
- `documents.rs` — `DashMap<Uri, DocumentEntry>` of `(text, tree)`. Reparses on every `upsert`.
- `parser.rs` — tree-sitter setup. Loads the `tree-sitter-sql` grammar; exposes `new_parser()`.
- `position.rs` — `position_to_byte_offset(text, Position)`. Walks lines + UTF-16 code units to land on the right byte.
- `context.rs` — defines `CursorContext` and `analyze_cursor`. Mixes textual heuristics with an AST ancestor walk because mid-edit trees are usually broken at the cursor.
- `scope.rs` — `Scope::collect(tree, source)`. Walks `relation` nodes under FROM/JOIN/UPDATE/DELETE, returns `Vec<Relation { table, alias }>`. Has a sentinel-retry path for the common dangling-dot case (`u.|`).
- `schema.rs` — `SchemaIndex { tables, fk_incoming, fk_outgoing, primary_keys }`. Built from raw maps via `from_raw` and held in an `Arc<RwLock>` so the connection layer can swap it in when the schema updates.
- `completion/` — dispatch + per-context constructors.
  - `completion/mod.rs` — `complete(ctx, scope, schema)` matches on `CursorContext` and assembles `Vec<CompletionItem>`.
  - `completion/keywords.rs` — keyword constants and `*_items()` constructors. One private `keyword_items(slice)` helper produces `CompletionItem`s with `kind = KEYWORD`.
  - `completion/fk_inference.rs` — turns a (left, right) pair of in-scope relations into a `users.organisation_id = organisations.id` snippet for JOIN ON contexts.
- `diagnostics.rs` — walks the tree and flags unknown table / column references against the schema. String literals, comments, and `:peek_*` parameter references are excluded.
- `_dump_tree.rs` — debug-only AST printer behind `#[cfg(test)]`.

## Cursor contexts

`CursorContext` is the v1 surface the dispatcher branches on. It's defined at `context.rs:6`.

| Variant | Trigger | `complete()` returns |
|---|---|---|
| `StatementStart` | empty buffer, just after `;`, or a lone partial identifier (e.g. `s`, `  sele`) | `LEADING_KEYWORDS` (`select`, `insert into`, `update`, `delete from`, `with`, `explain`) |
| `Table` | after `FROM`, `INSERT INTO`, `DELETE FROM`, `UPDATE`; or AST resolves to a `from`/`relation` node | tables + `GENERAL_CLAUSE_KEYWORDS` |
| `TableForJoin` | after `JOIN` (any flavor) without `ON` | tables + `GENERAL_CLAUSE_KEYWORDS` |
| `Column { qualifier: Some(q) }` | preceding text ends with `<ident>.` | columns of the relation `q` (or table named `q`) |
| `Column { qualifier: None }` | after `SELECT`, or AST resolves to a `field`/`select` node | in-scope columns + `SELECT_LIST_KEYWORDS` + `GENERAL_CLAUSE_KEYWORDS` |
| `UpdateSet { table }` | `UPDATE <table> [<alias>] SET <cur>` | columns of `table` |
| `JoinOnPredicate` | inside a `JOIN ... ON ...` predicate, or after `AND`/`OR` reachable from a JOIN's `ON` | FK snippet (if a pair is in scope) + in-scope columns + `JOIN_ON_OPERATORS` |
| `WhereClause` | after `WHERE`/`AND`/`OR` reachable from `WHERE`, or AST resolves to a `where` node | in-scope columns + `WHERE_OPERATORS` (`and`, `or`, `not`, `is null`, `in`, `like`, `between`, …) |
| `General` | none of the above match | tables + in-scope columns + `GENERAL_CLAUSE_KEYWORDS` |

Continuation keywords (`GENERAL_CLAUSE_KEYWORDS`) are intentionally merged into `Table`, `TableForJoin`, and `Column { qualifier: None }` as well as `General`. The cursor in those contexts often sits at the end of a partial word that could be either an identifier or a keyword (`select id f` → `from`, `from users w` → `where`); Monaco filters by prefix client-side, so coexistence is harmless and the alternative — missing keyword candidates while typing — is the bug this codifies.

## Detection strategy

`analyze_cursor` (`context.rs:30`) tries a sequence of heuristics, returning at the first match:

1. **String / comment guard** — if the offset falls inside a `string`, `comment`, or `marginalia` node, return `General` (effectively suppress completions).
2. **Empty prefix** — if `preceding_text` (everything since the last `;`) trims to empty, return `StatementStart`.
3. **Qualifier-before-dot** — `ends with <ident>.` → `Column { qualifier: Some(ident) }`.
4. **Trailing clause keyword** — `clause_keyword_before_cursor` matches a keyword at the end of `preceding`: `FROM`/`INSERT INTO`/`DELETE FROM`/`UPDATE` → `Table`; `JOIN` → `TableForJoin`; `WHERE`/`AND`/`OR` (with WHERE in the chain) → `WhereClause`; same with ON → `JoinOnPredicate`; `UPDATE x SET` → `UpdateSet { table: x }`; `SELECT` → `Column { qualifier: None }`.
5. **Lone partial identifier** — preceding text consists of nothing but a single bare identifier (`s`, `  sele`). The user is mid-typing their first keyword → `StatementStart`.
6. **AST ancestor walk** — descend to the deepest named node containing the offset, then walk parents looking for `field`, `where`, `from`, `join`, `select`, `set`, `assignment`. Each maps to a context.
7. **Fallback** — `General`.

The textual ladder runs before the AST walk because tree-sitter's tree mid-edit is usually broken: `select * from |` doesn't have a relation child to walk to. Matching on the trailing keyword text gets us the right answer regardless. The AST walk picks up cases the textual pattern can't (e.g. cursor inside an existing WHERE clause without trailing `WHERE`/`AND`/`OR`).

## Schema and scope

`SchemaIndex` (`schema.rs`) is the host's cached view of the connected database:

- `tables: HashMap<String, Vec<Column>>` — table name → ordered columns.
- `fk_incoming: (referenced_table, referenced_column) → Vec<(referencing_table, referencing_column)>` — "who points at me", straight from the upstream `references` map.
- `fk_outgoing` — the inverse, derived from `fk_incoming` on construction.
- `primary_keys: HashMap<String, Vec<String>>` — table name → ordered PK columns.

`Scope::collect(tree, source)` produces a `Vec<Relation { table, alias }>` for the document. v1 is flat — the whole tree is one scope. CTEs and subquery scopes are deferred. The dispatcher uses `scope.resolve(name)` to map a qualifier (alias or table name) back to a real table when looking up columns for `Column { qualifier: Some(_) }`.

`fk_inference::infer_join_predicate(left, right, schema)` (`completion/fk_inference.rs`) consults `fk_outgoing`/`fk_incoming` to find a foreign-key pair between the two most recently bound relations and emits a snippet like `u.organisation_id = o.id` for `JoinOnPredicate`.

## Adding a new context or keyword set

1. **Detect** — extend `clause_keyword_before_cursor` (`context.rs`) for textual patterns, or add a node-kind branch in `ancestor_context` for AST-driven cases. Add tests in `context.rs::tests`.
2. **Model** — if no existing `CursorContext` variant fits, add one. Carry data in fields where useful (`UpdateSet { table }` is the precedent).
3. **Constants** — add a `&[&str]` in `completion/keywords.rs` plus a thin constructor that delegates to `keyword_items`.
4. **Wire** — add an arm to the `match` in `completion/mod.rs::complete` that returns identifiers + the new keyword set.
5. **Verify** — add a scenario in `completion/tests.rs` using the existing `run(source, byte_offset)` helper. Assert on labels.

## Testing

- `cargo test lsp` (run from `src-tauri/`) executes everything under `lsp::`.
- `completion/tests.rs::run(source, byte_offset)` parses the source, calls `analyze_cursor`, collects scope, dispatches `complete`, and returns the resulting labels. Use it for end-to-end completion assertions.
- `context.rs::tests::analyze(source, byte_offset)` is the lower-level helper for context-only assertions — useful when you want to pin down detection logic without involving the dispatcher or schema.
- The `Backend` integration test in `backend.rs::tests` covers the full path including `did_change`/`completion` and a schema swap mid-session.

## Limitations and next steps

- No CTE or subquery scope — `Scope::collect` is flat across the whole document, so a column reference in an outer query can resolve against a CTE's columns. Fix: nested scopes keyed by AST ancestor.
- `GROUP BY` / `ORDER BY` / `HAVING` aren't first-class contexts. They're hit via the `General` fallback today, which is good enough for prefix-filtered keyword completion but won't surface, say, only-SELECT-list-aliases inside ORDER BY.
- No dialect awareness. Postgres-only constructs (`ILIKE`, `RETURNING`) and MySQL-only constructs (`LIMIT … OFFSET …` syntax variants) share one keyword table.
- Casing is hard-coded lowercase. A future improvement is to mirror the casing the user typed elsewhere in the buffer.
- No aggregate-function snippets (`count(*)`, `sum(...)`). `SELECT_LIST_KEYWORDS` is intentionally minimal in v1; add a `SELECT_LIST_FUNCTIONS` set with `insert_text_format = Snippet` when that's wanted.
- Diagnostics and completion don't share a parse — both call `Scope::collect` independently. Fine at current document sizes; revisit if profiling flags it.
