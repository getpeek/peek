use serde_json::Value;

/// Implemented by the host application to receive streamed events from the agent.
/// Both callbacks carry the ACP `sessionId` so the host can route each event to
/// the right Agent node — one connection multiplexes many sessions.
///
/// Object-safe and `Send + Sync` so it can be stored behind an `Arc<dyn AcpHost>`
/// and shared into the connection's handlers. Kept Tauri-free like the sibling
/// `peek-mcp`/`peek-lsp` crates.
#[async_trait::async_trait]
pub trait AcpHost: Send + Sync + std::fmt::Debug {
    /// Called once per `session/update`, with the update's `sessionId` and
    /// `SessionNotification.update` serialized to JSON (tagged by
    /// `sessionUpdate`: `agent_message_chunk`, `tool_call`, `plan`, …).
    async fn on_update(&self, session_id: String, update: Value);

    /// Called when the agent requests permission to run a tool, with the
    /// request's `sessionId` and the `RequestPermissionRequest` as JSON. Return
    /// the chosen `option_id`, or `None` to cancel the request.
    async fn request_permission(&self, session_id: String, request: Value) -> Option<String>;
}
