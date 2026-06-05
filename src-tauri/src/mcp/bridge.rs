//! The host→frontend RPC seam. The MCP tools run in the host, but most board
//! state (connection, pages, schema) lives in the React frontend; a tool calls
//! `request` and the binary's implementation round-trips through Tauri events to
//! the webview. Kept free of Tauri and `crate::` so the module can become its
//! own crate — and so future write-tools share one channel.

use std::sync::{Arc, OnceLock};

use serde_json::Value;

#[async_trait::async_trait]
pub trait FrontendBridge: Send + Sync + std::fmt::Debug {
    /// Ask the frontend to handle `method` with `params` and return its JSON
    /// reply. `Err` on transport failure or timeout.
    async fn request(&self, method: &str, params: Value) -> Result<Value, String>;
}

pub type SharedBridge = Arc<dyn FrontendBridge>;

/// Process-global bridge. `tool_fn` handlers take only their input argument, so
/// they reach the bridge through here rather than receiving it as a parameter.
/// `serve` installs it once before binding.
static BRIDGE: OnceLock<SharedBridge> = OnceLock::new();

pub(crate) fn init(bridge: SharedBridge) {
    let _ = BRIDGE.set(bridge);
}

/// Ask the frontend to handle `method` with `params`. `Err` when the bridge
/// hasn't been installed yet or the round-trip fails.
pub(crate) async fn request(method: &str, params: Value) -> Result<Value, String> {
    match BRIDGE.get() {
        Some(bridge) => bridge.request(method, params).await,
        None => Err("MCP bridge not initialised".to_string()),
    }
}
