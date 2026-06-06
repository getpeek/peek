---
name: result-export-formats
description: Plan and approach for Result node export formats (SQL done, Parquet next)
metadata:
  type: project
---

Result node (`src/canvas/nodes/Result/`) export/copy supports CSV, JSON, and SQL INSERT (added 2026-06-06).

**Why:** User wants result data usable in other tools beyond CSV/JSON.

**How to apply:**

- Format union is `ExportFormat` in `Result/serializeRows.ts`; `serializeRows(rows, format, tableName)` is the hub. Text formats serialize to a string and flow through both `exportRows` (writeTextFile) and `copyRows` (clipboard).
- SQL INSERTs reuse `formatSqlLiteral` + `buildInsertSql` from `Result/inlineEdit.ts` (typed literals). Target table comes from `getExportTableName(queryInfo, fallback)` in `inlineEdit.ts`.
- **Next:** Parquet export. Decided to generate bytes in the **Rust host** (Tauri command using `arrow`/`parquet` crates), not JS libs — fits "Rust owns DB I/O" and avoids bundle bloat. Binary formats need a `writeFile(Uint8Array)` path (not writeTextFile) and are export-only (no clipboard). `fs:write-all` capability already present.
