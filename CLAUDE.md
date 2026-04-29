# About Peek

Peek is a Figma-like database GUI where users place nodes of different types on an infinite 2D canvas. The UI is TypeScript + React 19 in Tauri 2, and talks to the host through a WASM bridge to Rust functions that own all database I/O.

# Stack

- **UI**: React 19 (with the React Compiler enabled — do not add manual `useMemo`/`useCallback` unless you've verified the compiler can't handle it), TypeScript, Vite.
- **Canvas**: `@xyflow/react` for the node graph.
- **State**: `jotai`. App-wide atoms live in `src/state.ts`; canvas atoms in `src/canvas/state.ts`.
- **UI kit**: `@mantine/*`, `@tabler/icons-react`.
- **Editor**: `@monaco-editor/react`.
- **AI**: `@langchain/core` + `@langchain/ollama` (local models).
- **Host bridge**: `@tauri-apps/api` and Tauri plugins (`fs`, `sql`, `dialog`, `opener`).
- **Tooling**: `oxlint` (lint) and `oxfmt` (format). No ESLint, no Prettier.

# Project layout

```
src/
  canvas/         React Flow canvas, document/page state, autosave, undo
    nodes/        One folder per node kind (Chat/, Query/, Result/, …)
  shapes/         Reusable presentational pieces consumed by nodes
  components/     Title bar and other top-level UI chrome
  Connection/     Workspace + DB connection types and UI
  command-palette/, drop-zone/, multiplayer/, themes/, tools/, db/
  state.ts        Cross-cutting jotai atoms (config, schema, dark mode, …)
src-tauri/        Rust host code (do not edit unless asked)
```

# Code style

## General

- Avoid nested `if`s; keep cyclomatic complexity low. Return early.
- Prefer immutability — chain `const` declarations rather than mutating locals.
- Use full words for identifiers (`truncatedString`, not `truncString`).
- TypeScript: never widen to `any`; prefer `unknown` and narrow. Use `import type { … }` for type-only imports.
- Named exports only. No default exports.

## Composability

Components stay thin. Push advanced logic into hooks (see `src/canvas/nodes/Chat/` — `ChatNode.tsx` is the shell, `useChatStream` / `useChatTools` / `useChatContextSync` carry the logic). Prefer extracting a child component over piling more responsibility into the parent.

## Functions

Small and self-contained. At most three parameters; if you'd reach for a fourth, take a single options object instead (see `useChatStream({ nodeId, runPrompt, handlers })`).

## Comments

Comments explain **why**, never **what**. Only write one when the reason is non-obvious — a hidden constraint, a workaround, a subtle ordering requirement. If removing the comment wouldn't confuse a future reader, don't write it.

# Conventions specific to this codebase

## State (jotai)

- Atoms prefixed with `_` (e.g. `_documentBaseAtom`) are private to their module. Always go through the exported wrapper atom — it carries side-effects (mutation listeners, remote-sync gating) that the raw atom does not.
- Persisted user state uses `atomWithStorage`. Don't reach into `localStorage` directly.

## Canvas nodes

- One folder per node type under `src/canvas/nodes/<NodeType>/`. The entry component is `<NodeType>Node.tsx`; co-locate its hooks in the same folder as `useFoo.ts`.
- Node bodies that scroll must mark themselves `nodrag` and use `useScrollFallthrough` so wheel events don't pan the canvas.
- Mutate node data via `canvas.updateNodeData<TData>(id, updater)` from `useCanvas()`. Don't reach into the document atom directly from a node.

## Styling

- Theme tokens are CSS variables prefixed `--pk-*`, defined in `src/canvas/nodes/node.css`. **Never hardcode colors, shadows, or font stacks** — always reference a `--pk-*` token. Add a new token there if one is missing.
- One `.css` file per component/feature, imported from the component file.

## Database & host I/O

- All database calls go through the Rust/WASM bridge or Tauri plugins. Do not add a JS-side SQL client or HTTP fetch to a database.

# Commands

- `yarn dev` — Vite dev server.
- `yarn build` — type-check + production build (`tsc && vite build`). Run before declaring a task done if you've touched TS.
- `yarn lint` / `yarn lint:fix` — oxlint.
- `yarn fmt` / `yarn fmt:check` — oxfmt.
- `yarn tauri dev` — full Tauri app (only when host-side behavior matters).

Always run `yarn lint` and `yarn fmt` after making changes.

# Don'ts

- Don't add backwards-compat shims, deprecated re-exports, or `// removed: …` markers when refactoring. Delete the old code.
- Don't introduce a new state library, CSS-in-JS solution, or bundler — extend what's here.
- Don't add `useMemo`/`useCallback`/`memo` reflexively; the React Compiler handles most of it. Only add them with a measured reason.
- Don't bypass `oxlint`/`oxfmt`. If a rule fights you, fix the code, don't disable the rule.
- Don't write speculative abstractions, options no caller passes, or error handling for cases that can't happen. Three similar lines beat a premature helper.
- Don't edit `src-tauri/` or `dist/` unless the task is explicitly Rust- or build-related.
