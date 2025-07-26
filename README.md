<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/4fc87548-4fa8-446d-ad23-23dcc20dcf53">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/4fc87548-4fa8-446d-ad23-23dcc20dcf53">
  <img alt="Helix" height="128" src="https://github.com/user-attachments/assets/4fc87548-4fa8-446d-ad23-23dcc20dcf53">
</picture>

</div>

# Peek

Peek is an Infinite Canvas based database client. Users can add query nodes, which when executed will spawn Result nodes. Foreign keys and references are clickable, which when clicked on spawn new result nodes.

## Demo

https://github.com/user-attachments/assets/fe88693b-4741-42bc-9286-67db0c44a084

## Installation

1. Clone this repo
2. yarn tauri build

Note, the UI requires you to have a workspace set up, but there is no UI to actually manage workspaces right now, so you'll have to create on in localstorage.

## TODO

# V.1

## Workspaces

- [x] Save/Load canvas (queries + connection) -> Workspaces
- [x] Save/Load connections -> Workspaces
- [x] UI to manage workspaces

## Introspection

- [ ] Show schema graph
- [x] Better completions based on query concrete syntax tree
- [ ] Query meta info (execution time, tables)

## UI

- [ ] Pagination on query results if limit/offset in query
- [ ] Context menu on result shape to select result tree
- [x] Charts
- [~] Virtualization for tables for large result shape performance

## Tools

- [ ] Live Queries
- [ ] Query history per Query shape, after each succesful query
- [ ] AI integration -> Query -> Result

## Export

- [x] Context menu on result shape to export to json, csv
- [x] export result as json/csv

## Misc

- [ ] Performance improvements somehow
- [ ] Get rid of AST parser in the frontend
- [ ] Maybe move completion suggestions to backend via wasm

# V.2

- [ ] Support for more databases

# V.3

- [ ] Support for more datasources (hubspot, salesforce, etc.)
