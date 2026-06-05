# MCP server

Peek can expose a [Model Context Protocol](https://modelcontextprotocol.io) server from the Rust host (`src-tauri/src/mcp/`) so AI agents can drive the app — there is no separate sidecar process. The server runs in-process on Tauri's async runtime and is **off by default**; it boots at startup only when `ai.mcp.enable` is set in `~/peek/settings.json`. It speaks Streamable HTTP with JSON, **no authentication**, and permissive CORS, so a local agent can connect without credentials or preflight friction. Origin validation is disabled for the same reason. Tools are built on [`tower-mcp`](https://docs.rs/tower-mcp).

The server exposes five **read-only** inspection tools so an agent can learn the lay of the land before acting, and eight **write** tools that edit the canvas — creating pages and nodes, wiring nodes together, and driving the camera and selection (see [Tools](#tools)). Most of that state lives in the React frontend, not the host, so the tools reach it through a host→frontend [bridge](#frontend-bridge) — the same channel the write tools use to mutate the board.

## Transport

A tool call flows through:

```
agent → POST http://<host>:<port>/        (Streamable HTTP, JSON-RPC)
  → CorsLayer (permissive)                 axum middleware
  → HttpTransport router                   tower-mcp, origin validation disabled
  → McpRouter dispatch                     match tool name
  → ToolBuilder handler                    deserialize input, return CallToolResult
```

`serve` (`server.rs`) assembles the stack the way the request flows back up:

```rust
let app = HttpTransport::new(router)
    .disable_origin_validation()
    .into_router()                      // → axum::Router
    .layer(CorsLayer::permissive());

let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
axum::serve(listener, app).await?;
```

The server binds `0.0.0.0` (all interfaces), so it is reachable from other machines and containers on the network. Because there is no auth, anything that can route to the port can drive the canvas — treat the port as trusted-network-only.

## Config

Two keys under `ai.mcp` in `~/peek/settings.json` (defined in `config/mod.rs::McpConfig`, validated by `config/settings.schema.json`):

| Key      | Type    | Default | Meaning                                       |
| -------- | ------- | ------- | --------------------------------------------- |
| `enable` | boolean | `false` | Run the MCP server at startup.                |
| `port`   | integer | `13315` | Port the server listens on (binds `0.0.0.0`). |

```json
{
  "ai": { "mcp": { "enable": true, "port": 13315 } }
}
```

Both keys default independently, so `"ai": { "mcp": { "enable": true } }` is enough to run on `13315`. Changes take effect on **app restart** — the server boots once during Tauri's `setup` hook. There is no in-app toggle (Peek has no settings UI; settings are edited in the file), so changing the port or disabling the server means editing `settings.json` and relaunching.

## Tools

The inspection tools are read-only; the write tools (`create_page`, `create_query_node`, `create_vars_node`, `connect_nodes`, `camera_pan_to`, `camera_set_zoom`, `camera_fit_node`, `select_nodes`) edit the canvas. All return their payload as JSON text (the agent parses it); a failure comes back as a `CallToolResult` with `is_error: true` rather than a protocol error.

| Tool                  | Input         | Returns                                                                                                                                              |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_connection_info` | —             | `{ name, engine }` of the active connection (`engine` is `postgresql`/`mysql`). **Never** the URL or credentials; `null` when no connection is open. |
| `get_db_schema`       | —             | `{ tables, references, primaryKeys }` for the active connection — columns + types, foreign keys, primary keys.                                       |
| `get_active_page_id`  | —             | `{ activePageId }` for the currently selected page.                                                                                                  |
| `get_pages`           | —             | `[{ id, name, order }]` for every page on the current connection.                                                                                    |
| `get_page_content`    | `{ page_id }` | The page's serialized nodes/edges/viewport, **with embedded data rows stripped**; an error when the id is unknown.                                   |

`get_page_content` never exposes database content: result-node rows already live in a separate store, and the frontend strips any node's `data.data` (e.g. a barchart's charted rows) before replying.

### Write tools

The write tools run on the frontend (the host only forwards the request) and reply with the created id plus its page. For the node creators, `page_id` is optional — omit it or pass `null` to target the active page; an unknown id is an error, and placing a node reveals (activates) its page. `position` and `size` are `[x, y]` and `[width, height]` in flow coordinates.

| Tool                | Input                                             | Returns                                                                                 |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `create_page`       | `{ name, order }`                                 | `{ id, name, order }`; creates an empty page at `order` (clamped) and switches to it.   |
| `create_query_node` | `{ page_id?, query, position, size }`             | `{ nodeId, pageId }`; error when the page id is unknown.                                |
| `create_vars_node`  | `{ page_id?, variables, global, position, size }` | `{ nodeId, pageId }`; error on an unknown page, an empty map, or an invalid name.       |
| `connect_nodes`     | `{ from, to }`                                    | `{ edgeId, pageId }`; error if either node is missing or they're on different pages.    |
| `camera_pan_to`     | `{ position }`                                    | `{ ok: true }`; centers the camera on `[x, y]` (flow coords), keeping the current zoom. |
| `camera_set_zoom`   | `{ zoom }`                                        | `{ zoom }`; sets zoom (1.0 = 100%), clamped to 0.1–4.0, and returns the applied value.  |
| `camera_fit_node`   | `{ node_id }`                                     | `{ nodeId, pageId }`; frames the node at ≤100% zoom; error if the id is unknown.        |
| `select_nodes`      | `{ node_ids }`                                    | `{ selected, pageId }`; replaces the selection; error if the first id is unknown.       |

A Variable node holds reusable named values — ids, timestamps, status filters — that queries reference with `@name`, so a value lives in one place. `variables` is a map of name → value, where each value is a string or a list of strings. Variables apply to a query **only through an edge** (`variable → query`), so `create_query_node` auto-connects the new query to existing global variable nodes, and `create_vars_node` with `global: true` auto-connects the new node to every query on the page. `connect_nodes` makes that wiring explicit — e.g. attach a non-global variable node to a specific query. Both endpoints must be on one page (edges don't span pages); the call is idempotent and doesn't change the active page.

The camera and selection tools act on the live view through React Flow's imperative API (the viewport is uncontrolled, so a document write wouldn't move it). They need a board to be open — if none is mounted they return `{ error: "canvas not available" }`. `camera_fit_node` and `select_nodes` switch to the node's page when it isn't the active one; `select_nodes` selection is per-page (an empty `node_ids` clears it, and ids on other pages are dropped from the returned `selected`).

## Frontend bridge

The connection, pages, and schema all live in the React frontend (jotai atoms), not the host. So a tool **asks the frontend** over a request/response bridge:

```
#[tool_fn] handler → bridge::request(method, params)           (host, mcp/bridge.rs)
  → TauriBridge: app.emit("mcp:request", {id, method, params}) (mcp_commands.rs)
  → useMcpBridge listens, reads atoms via getDefaultStore       (src/mcp/useMcpBridge.ts)
  → invoke("mcp_respond", {id, result})                         (frontend → host)
  → oneshot resolves request()                                  (5 s timeout → is_error)
```

`mcp/` defines only the `FrontendBridge` trait; the binary implements it (`mcp_commands::TauriBridge`) with the `AppHandle` + a `PendingRequests` map of `oneshot` senders keyed by request id. `serve` installs that implementation into a process-global (`bridge::init`), and tools reach it through the free `bridge::request` helper — `#[tool_fn]` handlers take only their input argument, so they can't receive the bridge as a parameter. This is the seam every write-tool dispatches through.

## Modules

- `mcp/mod.rs` — public surface. Re-exports `serve` and `FrontendBridge`/`SharedBridge`.
- `mcp/bridge.rs` — the `FrontendBridge` trait (Tauri-free), a process-global `OnceLock<SharedBridge>`, and the `init` / `request` helpers tools call.
- `mcp/server.rs` — `serve(port, bridge)`: installs the bridge, builds the `McpRouter` from the tools' generated `*_tool()` constructors, wraps in `HttpTransport`, applies CORS, binds, serves.
- `mcp/connection.rs`, `mcp/schema.rs`, `mcp/pages.rs`, `mcp/nodes.rs`, `mcp/view.rs` — one file per tool concern; each is one or more `#[tool_fn]` async handlers plus their `schemars` input structs. `nodes.rs` holds the node/edge write-tools (`create_query_node` / `create_vars_node` / `connect_nodes`); `view.rs` holds the camera/selection write-tools (`camera_pan_to` / `camera_set_zoom` / `camera_fit_node` / `select_nodes`).
- `mcp/reply.rs` — the shared `tool_result` helper that maps a frontend `{ error }` reply to a tool error and any other payload to a text result.
- `mcp_commands.rs` (crate-level, has Tauri) — `TauriBridge` (the `FrontendBridge` impl), the `PendingRequests` registry type, and the `mcp_respond` command.

Tools are defined with the `#[tool_fn]` attribute macro from `tower-mcp-macros` (pulled in via the `macros` feature on `tower-mcp`). The macro turns `async fn foo(input: FooInput)` into a `foo_tool()` constructor that `server.rs` registers with `.tool(...)`.

The `mcp/` module imports **nothing from `crate::`** and nothing from Tauri — it depends only on the `FrontendBridge` trait it defines (mirroring how `lsp/` stays Tauri-free while `lsp_commands.rs` holds the command glue). So `mcp/` can be lifted into its own workspace crate (`crates/peek-mcp/`) by moving the folder and adding a `Cargo.toml`, with no internal rewrites.

The server is spawned from the `.setup(...)` closure in `lib.rs::run`: it reads `PeekConfig::get_or_default().ai.mcp` once and, if enabled, builds a `TauriBridge` from the `AppHandle` and `tauri::async_runtime::spawn`s `mcp::serve(port, bridge)`. A bind failure is logged to stderr rather than crashing the app.

## Adding a tool

1. **File** — add `mcp/<concern>.rs` (or a new handler in an existing concern file).
2. **Input** — define a `pub struct` deriving `Debug, Serialize, Deserialize, schemars::JsonSchema`; annotate fields with `#[schemars(description = "…")]`. An empty struct models a no-argument tool.
3. **Handler** — write `#[tool_fn(name = "…", description = "…")] pub async fn foo(input: FooInput) -> Result<CallToolResult, tower_mcp::Error>`. Return `Ok(CallToolResult::text(..))` on success; `Ok(CallToolResult::error(message))` (sets `is_error: true`) so the agent sees the failure message.
4. **Register** — add `.tool(<concern>::foo_tool())` to `server.rs::app` (the macro generates `foo_tool()`).
5. **Reach the frontend** — for state the host doesn't own, `bridge::request("<method>", params).await` and add a matching `case` to `handleRequest` in `src/mcp/useMcpBridge.ts`. Strip any DB-derived rows on the frontend before replying.

## Testing / connecting an agent

1. Set `"ai": { "mcp": { "enable": true } }` in `~/peek/settings.json` and launch the app (`yarn tauri dev`).
2. Confirm it is listening: `lsof -i :13315` should show the Peek process in `LISTEN`. A failed bind logs `MCP server failed to start: …` to stderr.
3. Point an MCP client at it. For Claude Code:
   ```
   claude mcp add --transport http peek http://127.0.0.1:13315/
   ```
   Then call an inspection tool such as `get_pages`. A successful call from an agent with no credentials confirms auth and CORS are non-issues. For the canvas tools to return data, open a connection in the running app first.
4. With `enable` at its default (`false`), nothing listens on the port.

## Limitations and next steps

- **No auth, wide bind.** The server binds `0.0.0.0` with no authentication. Fine on a trusted network or a single machine; a token/loopback-only mode is future work if remote exposure is needed.
- **The frontend must be running to answer.** Every tool round-trips to the webview; if no window is answering, `request` times out after 5 s and the tool returns an `is_error` result. Tools reflect the live in-memory board (no disk staleness).
- **Writes cover content and view so far.** `create_page` adds pages, `create_query_node` / `create_vars_node` place nodes, `connect_nodes` wires them, and `camera_pan_to` / `camera_set_zoom` / `camera_fit_node` / `select_nodes` drive the view and selection. Page rename/delete/reorder and result analysis remain planned write-tools — they dispatch through the same `FrontendBridge`.
- **Restart to apply config.** `enable`/`port` are read once at startup. Live reconfiguration would require tearing down and rebinding the server on a config change.
- **Deferred crate split.** `mcp/` (and `lsp/`) are slated to move into their own workspace member crates to cut incremental compile times. The module is already `crate::`- and Tauri-free to make that move mechanical.
