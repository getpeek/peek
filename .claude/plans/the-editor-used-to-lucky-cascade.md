# Restore SQL completion in the Monaco editor

## Context

SQL autocomplete in the query editor is broken. Typing in a query node produces no suggestions even when a connection is active and `schemaAtom` is populated. The user remembers it working until recently. This is the **fix-only** round; a follow-up round will add improvements.

## Diagnosis

The infrastructure is intact — the breakage is one file.

- `src/shapes/Query/Editor/languageProvider.ts` was gutted in commit **`aee4f1c`** ("Save to file instead of local storage"): 581 lines → 67 lines (`-555 / +42`).
- The current `provideCompletionItems` runs a partial tree-sitter `Query`, logs to console, and unconditionally `return { suggestions: [] }` (line 62).
- The function signature still claims `tables` and `references` props but only destructures `parser` and `language` (lines 4–7), so even if logic existed, the schema would be unreachable.
- The redundant `parser.setLanguage(language)` on line 13 is harmless — same call already runs in `useInitTreesitter.tsx:20`.
- A leftover `console.log({ textBefore, range, word, matches, node })` on line 60 should not ship.

What was *not* broken (verified):
- `src/app/useInitTreesitter.tsx` — `Parser.init()` then `Language.load("/tree-sitter-sql.wasm")`, sets `sqlParserAtom` / `sqlLanguageAtom`. Wired in `App.tsx:24`.
- `public/tree-sitter.wasm` (205 KB) and `public/tree-sitter-sql.wasm` (2.4 MB) both present. `package.json` postinstall copies the runtime.
- `vite.config.ts` — `optimizeDeps: { exclude: ["web-tree-sitter"] }` and `assetsInclude: ["**/*.wasm"]`.
- `src/shapes/Query/Editor/MonacoManager.tsx` — off-screen `<Editor>` mounts, captures the global Monaco instance, and `languages.registerCompletionItemProvider("sql", provider)`. Disposes/re-registers when `schema | parser | language` changes. Mounted in `App.tsx:35`.
- `schemaAtom` shape (`src/state.ts:17–23`): `{ tables: Record<string, [string, string][]>, references: Record<string, string[]> }`. Populated in `TitleBarConnectionPicker.tsx` after a connection is picked, and in `DropZone.tsx` for dropped DBs.
- web-tree-sitter `0.25.10` exposes every API the old provider used: `Query`, `query.captures(node)`, `query.matches(node)`, `node.descendantForPosition(point)`, `node.childForFieldName(name)`, `node.children`, `node.parent`. Confirmed in `node_modules/web-tree-sitter/web-tree-sitter.d.ts`.

Conclusion: the only broken thing is the contents of `languageProvider.ts`.

## Fix

Restore `src/shapes/Query/Editor/languageProvider.ts` to the implementation from commit `1841b60` ("View schema command"), with two trivial cleanups noted below.

The previous implementation provides:

| Helper | What it does |
|---|---|
| `findNodeAtPosition(node, line, column)` | Recursive AST descent to the cursor's node. |
| `getTableAliases(rootNode)` | tree-sitter `Query` over `relation { object_reference, alias }` → `Map<alias, tableName>`. |
| `getColumnsForTable(name)` | `tables[name] ?? []` lookup against the schema. |
| `getAvailableTablesAndAliases(rootNode)` | Walks `from` and `join` nodes, returns `{ tables: Map<aliasOrName, tableName>, availableColumns: string[] }`. |
| `getCompletionContext(node, root, model, position)` | Returns one of `table \| column \| table_for_join \| where_clause \| join_on_clause \| general`, plus optional `tableContext`, by combining cursor-position regex (`/\bFROM\s*$/i`, `/\bJOIN\s*$/i`, `/\bWHERE\s*$/i`, `/(\w+)\.$/`) with AST node-type walking. |
| `provideCompletionItems` | Switches on context type and emits `CompletionItem[]` (tables → `Class`, columns → `Field`, aliases → `Variable`, `=`/`AND`/`OR` for `join_on_clause` → `Operator`/`Keyword`). Wrapped in `try/catch` with `console.error`. |

Trigger characters: `[" ", ".", ",", "\n", "\t"]` (currently only `[" ", "."]`).

### Cleanups during restoration

1. **Remove the redundant `parser.setLanguage(language)` line** from `createSqlProvider`. The parser is the same global instance that `useInitTreesitter` already configured; the only effect of re-setting is wasted work on every provider instantiation.
2. **Drop the debug `console.log`** that the gutted version added.

Everything else: byte-for-byte restoration. No refactor, no helper extraction, no SQL-keyword additions, no caching — those land in the improvement round.

### Files modified

- `src/shapes/Query/Editor/languageProvider.ts` — **only file touched**.

### Files NOT modified (intentional)

- `MonacoManager.tsx` — wiring is correct as-is. (Note for the improvement round: when `schema` is the initial empty `{ tables: {}, references: {} }`, the provider registers once with no data, then re-registers when schema arrives. Harmless.)
- `useInitTreesitter.tsx` — works.
- `SqlEditor.tsx` — completion is registered globally per Monaco language; per-editor wiring not needed.

## Out of scope (next round — "a bunch of improvements")

Tracking these for the next pass so the restoration stays minimal:

- Cache compiled `Query` objects (currently rebuilt on every keystroke).
- Add SQL keyword completions (`SELECT`, `FROM`, `JOIN`, `WHERE`, ...).
- Trim the `general` case so it doesn't dump every column in the database.
- Subquery / CTE scope handling.
- Quoted identifier handling (`"my col"`, `` `my_col` ``).
- Dialect awareness (postgres vs sqlite vs mysql) — currently single SQL grammar.
- Extract `findNodeAtPosition`, `getCompletionContext`, etc. into separate modules for testability.
- Smarter ranking (recently-used tables first, foreign-key-related tables higher in JOIN context).
- Fix the `MonacoManager` initial-empty-schema double registration.

## Verification

1. `npm run dev` (or `npm run tauri dev`) and open the app.
2. Pick or create a workspace connection so `schemaAtom` is populated. Confirm via the "View schema" command palette entry that tables and columns are loaded.
3. Open a query node on the canvas.
4. Type `SELECT ` — expect column suggestions.
5. Type `SELECT * FROM ` — expect table suggestions.
6. Type `SELECT * FROM users u JOIN ` — expect tables that have FK references (`references[table]`-aware).
7. Type `SELECT * FROM users u WHERE u.` — expect columns of `users`.
8. Type `SELECT * FROM users u JOIN orders o ON ` — expect `=`, `AND`, `OR`, plus columns.
9. Confirm no `console.log`/`console.error` spam in the devtools console during normal typing.
10. With an empty schema (no connection picked), typing should produce zero suggestions and zero errors.
