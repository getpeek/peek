# ACP agent (external coding agents)

Peek's built-in Agent node can be backed by an **external [Agent Client Protocol](https://agentclientprotocol.com) agent** — Claude Code by default, or any ACP-compatible agent (Gemini CLI, etc.) — instead of the local Ollama endpoint. Peek acts as the ACP **client**: it spawns the agent as a subprocess, speaks JSON-RPC over its stdio, and streams the turn into the Agent node.

The agent drives the canvas through Peek's **own [MCP server](./mcp.md)**: at `session/new` Peek forwards its MCP endpoint to the agent, so the agent reaches the same ~21 canvas tools an external MCP client would. **MCP is the tool layer; ACP is the agent layer.** Nothing about the tools is reimplemented for this path — the agent runs its own model + tool loop and calls the MCP tools directly.

This path is **desktop/host-only**: it spawns a subprocess, so there is no `peek-web` (guest) equivalent, and multiplayer guests don't share the host's agent.

## Choosing a provider

Each backend has its own optional block under `ai`, and **a block's presence is what enables that backend**:

| Backend  | Block       | Behavior                                                                                         |
| -------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `ollama` | `ai.ollama` | in-frontend LangChain loop against an OpenAI/Ollama-compatible endpoint; Peek runs the tool loop |
| `acp`    | `ai.acp`    | an external ACP agent spawned as a subprocess; the agent runs its own loop                       |

`ai.default_provider` picks the backend for **new** Agent nodes; each node can switch via a pill in its header (persisted per node in `data.provider`). Only configured backends are offered — if neither block is present the node shows a "no backend configured" message. The two backends are separate components (`OllamaAgentNode` / `AcpAgentNode`) behind one node kind, because the ACP one starts a subprocess on mount.

`ai.ollama` also backs **background AI** — query auto-labeling and AI region grouping. Those features (and their command-palette entries) are hidden when `ai.ollama` is absent. Data export still works without it (it falls back to a plain filename).

## Config

Under `ai.acp` (defined in `config/mod.rs::AcpConfig`, validated by `settings.schema.json`):

| Key       | Type              | Default                                           | Meaning                                                                           |
| --------- | ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `command` | string            | `"npx"`                                           | Executable that launches the agent.                                               |
| `args`    | string[]          | `["-y", "@agentclientprotocol/claude-agent-acp"]` | Arguments — the Claude Code ACP adapter by default.                               |
| `env`     | object            | `{}`                                              | Extra env for the subprocess. The agent owns its auth (e.g. `ANTHROPIC_API_KEY`). |
| `cwd`     | string (optional) | `~/peek`                                          | Session root sent at `session/new`.                                               |

```json
{
  "ai": {
    "default_provider": "acp",
    "ollama": { "model": "gemma4:12b-mlx", "url": "http://localhost:11434" },
    "automatically_label_queries": true,
    "acp": { "command": "npx", "args": ["-y", "@agentclientprotocol/claude-agent-acp"] },
    "mcp": { "enable": true, "port": 13315 }
  }
}
```

**Enable `ai.mcp.enable` too.** Without it the agent still chats, but Peek forwards no MCP server, so it has no canvas tools — the Agent node shows a warning banner in that case.

**Auth is the agent's job.** Peek passes no Anthropic credentials of its own; the Claude adapter uses an existing Claude Code login or an `ANTHROPIC_API_KEY` in `ai.acp.env`. Requires Node ≥ 22.

**PATH in a packaged app.** A macOS/Linux app launched from the Dock/Finder inherits a stripped `PATH` that omits Homebrew, nvm, Volta, etc., so `npx` wouldn't be found (it works under `tauri dev` only because the terminal passes the full `PATH` through). Before spawning, `acp_commands::build_spawn_config` recovers the login-shell `PATH`, resolves `command` to an absolute path, and passes that `PATH` to the child so `npx` can find `node`. A `PATH` you set explicitly in `ai.acp.env` is left untouched.

## Modes

The current mode shows as a pill after the agent name in the node header (only when the agent advertises session modes, e.g. Claude Code); clicking it opens a popover to switch. Driven by ACP `session/set_mode`:

- **Manual** (default) — the agent requests permission per tool call; Peek shows an allow/reject prompt.
- **Auto** (accept-edits) — edits apply without prompting.
- **Plan** — the agent produces a plan without mutating the canvas; switch to Manual/Auto to execute.

Press **Shift+Tab** in the composer to cycle modes (Plan → Auto → Manual → …), mirroring Claude Code (the popover footer notes this). The pill reflects the agent's `current_mode_update` notifications, so agent-initiated mode changes stay in sync.

## Flow

```
Agent node (AcpAgentNode) → invoke("acp_open_session", { nodeId })   (frontend → host)
  → acp_commands spawns peek-acp::AcpConnection once (one shared subprocess)
    → spawns `npx … claude-agent-acp` (stdio JSON-RPC) → initialize
  → connection.new_session { cwd, mcpServers: [peek MCP] } → { sessionId, modes }
Agent node → invoke("acp_prompt", { nodeId, text })                  → session/prompt
  ← session/update             → emit "acp:update"     { sessionId, update }   → node keeps only its sessionId
  ← session/request_permission → emit "acp:permission" { id, sessionId, … }    → PermissionPrompt
      → invoke("acp_permission_respond", { id, optionId })                     → resolves the request
Claude Code → MCP tools → Peek MCP server → canvas mutations
```

One connection (subprocess) hosts **one session per Agent node**, keyed by node id, so conversations stay isolated across nodes and across connection switches (each document's nodes have distinct ids). Every node listens to the same global event stream and keeps only the events matching its own `sessionId`. `session/update` notifications (`agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`, `plan`, `current_mode_update`) are translated into the node's `Message` list; permission requests round-trip through an emit-event + `oneshot` bridge (the same pattern as [`mcp_commands`](./mcp.md#frontend-bridge)). The Stop button sends `session/cancel`. Prompts are dispatched with the connection's `cx.spawn`, so a long turn on one session never blocks another session's prompt, mode change, or cancel.

## Modules

- `crates/acp/` — the Tauri-free `peek-acp` crate (like `peek-mcp`/`peek-lsp`). Wraps [`agent-client-protocol`](https://docs.rs/agent-client-protocol):
  - `connection.rs` — `AcpConnection`: spawns the subprocess and runs one long-lived JSON-RPC connection on a background task pumped by a command channel, hosting **many sessions**. `new_session` / `prompt` / `set_mode` / `cancel` take a session id; prompts run via `cx.spawn` so sessions don't block each other. `SessionInfo` reports a session's id + modes. `Drop` aborts the task, which SIGKILLs the child.
  - `host.rs` — the `AcpHost` trait the app implements (`on_update(session_id, …)`, `request_permission(session_id, …)`), keeping the crate Tauri-free.
  - `config.rs` — `AcpSpawnConfig` (subprocess command/args/env; per-session cwd + MCP servers are passed to `new_session`).
- `src/acp_commands.rs` (app crate) — `AcpState` (one connection + a `SessionInfo` per node id), the `TauriAcpHost` bridge, and the `acp_open_session` / `acp_prompt` / `acp_set_mode` / `acp_cancel` / `acp_permission_respond` / `acp_stop` commands (all but the last take a `nodeId`). Registered in `lib.rs`.
- Frontend `src/canvas/nodes/Agent/`: `AgentNode` (brancher — resolves the per-node provider, renders `AgentUnconfigured` when no backend) → `OllamaAgentNode` / `AcpAgentNode`; `AgentProviderSelector` (header pill switching backend); `useAcpStream` (session lifecycle, prompts, permissions) + `useAcpMessageSink` (update→`Message` mapping), `acpUpdates` (payload types + helpers), `AgentModeSelector`, `PermissionPrompt`, `PlanBlock`, `AcpToolBlock`; shared shell `AgentView`.

## Testing / connecting

1. `npx -y @agentclientprotocol/claude-agent-acp` should run (Node ≥ 22); make sure Claude Code is logged in or set `ANTHROPIC_API_KEY` in `ai.acp.env`.
2. Set `ai.default_provider: "acp"`, an `ai.acp` block, and `ai.mcp.enable: true` in `~/peek/settings.json`; launch `yarn tauri dev`.
3. Open a DB connection, add an Agent node (its header reads the agent name and shows the mode selector), and ask e.g. _"Create a query node selecting from <table>."_
4. Confirm the subprocess spawns (`pgrep -f claude-agent-acp`), text/thoughts stream in, a permission prompt appears in **Manual**, and approving it creates the node via Peek's MCP server. **Auto** skips the prompt; **Plan** returns a plan without mutating the canvas.

## Limitations and next steps

- **One subprocess, a session per node.** A single agent process is shared, but each Agent node gets its own ACP session (isolated conversation), reused across remounts. Sessions live only for the app's lifetime — they aren't persisted, so a restart starts each node fresh (its saved message history remains, but the agent's own context resets).
- **Restart to change provider/command.** `ai.acp` is read when the agent is first spawned.
- **Session cwd only.** The transport can't set the child's process directory, only the ACP session cwd (what the Claude adapter uses).
- **No multiplayer relay.** The subprocess lives on the host; running the host's ACP agent on behalf of guests over gossip is deferred.
