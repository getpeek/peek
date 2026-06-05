use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use parking_lot::Mutex;
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::oneshot;

use crate::mcp::FrontendBridge;

/// In-flight host→frontend requests, keyed by id. The `request` side inserts a
/// sender before emitting; `mcp_respond` removes and fulfils it.
pub type PendingRequests = Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>>;

#[derive(Debug)]
pub struct TauriBridge {
    app: AppHandle,
    pending: PendingRequests,
    counter: AtomicU64,
}

impl TauriBridge {
    pub fn new(app: AppHandle, pending: PendingRequests) -> Self {
        Self {
            app,
            pending,
            counter: AtomicU64::new(0),
        }
    }
}

#[async_trait::async_trait]
impl FrontendBridge for TauriBridge {
    async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.counter.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().insert(id, tx);

        self.app
            .emit(
                "mcp:request",
                json!({ "id": id, "method": method, "params": params }),
            )
            .map_err(|e| e.to_string())?;

        match tokio::time::timeout(Duration::from_secs(5), rx).await {
            Ok(Ok(value)) => Ok(value),
            Ok(Err(_)) => Err("frontend dropped the MCP response".to_string()),
            Err(_) => {
                self.pending.lock().remove(&id);
                Err(format!(
                    "frontend did not answer MCP request '{method}' in time"
                ))
            }
        }
    }
}

#[tauri::command]
pub fn mcp_respond(
    pending: State<'_, PendingRequests>,
    id: u64,
    result: Value,
) -> Result<(), String> {
    if let Some(tx) = pending.lock().remove(&id) {
        let _ = tx.send(result);
    }
    Ok(())
}
