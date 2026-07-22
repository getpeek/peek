// Tauri hands `State` (and `AppHandle`) over by value, so these command
// signatures can't take references.
#![allow(clippy::needless_pass_by_value)]

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use parking_lot::Mutex;
use serde::Serialize;
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex as AsyncMutex;
use tokio::sync::oneshot;

use peek_acp::{AcpConnection, AcpHost, AcpSpawnConfig, SessionInfo};

use crate::config::PeekConfig;

const MCP_DISABLED_WARNING: &str = "Peek's MCP server is off (ai.mcp.enable). The agent can chat but can't drive the canvas — enable it and restart.";

/// Permission requests awaiting the user's choice, keyed by id. The host inserts
/// a sender before emitting `acp:permission`; `acp_permission_respond` removes
/// and fulfils it with the chosen `optionId` (or `None` to cancel).
type PendingPermissions = Arc<Mutex<HashMap<u64, oneshot::Sender<Option<String>>>>>;

/// Process-global ACP state: one agent connection hosting a session per Agent
/// node (keyed by node id, so conversations stay isolated and survive a node
/// remount on connection switch), plus in-flight permission prompts.
#[derive(Debug, Default)]
pub(crate) struct AcpState {
    connection: AsyncMutex<Option<Arc<AcpConnection>>>,
    sessions: Mutex<HashMap<String, SessionInfo>>,
    pending: PendingPermissions,
}

impl AcpState {
    pub(crate) fn new() -> Self {
        Self::default()
    }
}

/// Bridges the Tauri-free `peek-acp` crate to the webview: streams session
/// updates as `acp:update` events (tagged with `sessionId` so each node keeps
/// only its own) and turns permission requests into `acp:permission` events
/// answered by the `acp_permission_respond` command.
#[derive(Debug)]
struct TauriAcpHost {
    app: AppHandle,
    pending: PendingPermissions,
    counter: AtomicU64,
}

#[async_trait::async_trait]
impl AcpHost for TauriAcpHost {
    async fn on_update(&self, session_id: String, update: Value) {
        let _ = self.app.emit(
            "acp:update",
            json!({ "sessionId": session_id, "update": update }),
        );
    }

    async fn request_permission(&self, session_id: String, request: Value) -> Option<String> {
        let id = self.counter.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().insert(id, tx);

        if self
            .app
            .emit(
                "acp:permission",
                json!({ "id": id, "sessionId": session_id, "request": request }),
            )
            .is_err()
        {
            self.pending.lock().remove(&id);
            return None;
        }

        // Permission is a human decision, so wait generously; on timeout treat it
        // as a cancel and clean up the pending entry.
        match tokio::time::timeout(Duration::from_mins(5), rx).await {
            Ok(Ok(choice)) => choice,
            Ok(Err(_)) => None,
            Err(_) => {
                self.pending.lock().remove(&id);
                None
            }
        }
    }
}

#[derive(Debug, Serialize)]
pub(crate) struct AcpMode {
    id: String,
    name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AcpStartResult {
    session_id: String,
    modes: Vec<AcpMode>,
    current_mode: Option<String>,
    mcp_forwarded: bool,
    warning: Option<String>,
}

fn start_result(info: &SessionInfo, mcp_enabled: bool) -> AcpStartResult {
    AcpStartResult {
        session_id: info.session_id.clone(),
        modes: info
            .available_modes
            .iter()
            .map(|(id, name)| AcpMode {
                id: id.clone(),
                name: name.clone(),
            })
            .collect(),
        current_mode: info.current_mode.clone(),
        mcp_forwarded: mcp_enabled,
        warning: (!mcp_enabled).then(|| MCP_DISABLED_WARNING.to_string()),
    }
}

/// Ensure the shared agent subprocess is running, spawning it (with the
/// configured command + Peek's MCP forwarding intent) on first use.
async fn ensure_connection(
    app: &AppHandle,
    state: &AcpState,
) -> Result<Arc<AcpConnection>, String> {
    let mut guard = state.connection.lock().await;
    if let Some(connection) = guard.as_ref() {
        return Ok(Arc::clone(connection));
    }

    let acp = PeekConfig::get_or_default()
        .ai
        .acp
        .ok_or_else(|| "ACP is not configured (ai.acp)".to_string())?;
    let config = AcpSpawnConfig {
        command: acp.command,
        args: acp.args,
        env: acp.env.into_iter().collect(),
    };
    let host = Arc::new(TauriAcpHost {
        app: app.clone(),
        pending: Arc::clone(&state.pending),
        counter: AtomicU64::new(0),
    });

    let connection = Arc::new(
        AcpConnection::spawn(config, host)
            .await
            .map_err(|e| e.to_string())?,
    );
    *guard = Some(Arc::clone(&connection));
    Ok(connection)
}

fn session_id_for(state: &AcpState, node_id: &str) -> Result<String, String> {
    state
        .sessions
        .lock()
        .get(node_id)
        .map(|info| info.session_id.clone())
        .ok_or_else(|| "no ACP session for this node".to_string())
}

async fn running_connection(state: &AcpState) -> Result<Arc<AcpConnection>, String> {
    state
        .connection
        .lock()
        .await
        .as_ref()
        .map(Arc::clone)
        .ok_or_else(|| "no ACP agent is running".to_string())
}

/// Open (or reuse) this node's session, spawning the agent if needed and
/// forwarding Peek's MCP server when it's enabled. Reused across remounts so a
/// node keeps its conversation.
///
/// # Errors
/// Returns an error if the agent can't be spawned or the session can't be opened.
#[tauri::command]
pub(crate) async fn acp_open_session(
    app: AppHandle,
    state: State<'_, AcpState>,
    node_id: String,
) -> Result<AcpStartResult, String> {
    let ai = PeekConfig::get_or_default().ai;
    let mcp_enabled = ai.mcp.enable;

    if let Some(info) = state.sessions.lock().get(&node_id).cloned() {
        return Ok(start_result(&info, mcp_enabled));
    }

    let connection = ensure_connection(&app, &state).await?;

    let mcp_http_servers = if mcp_enabled {
        vec![(
            "peek".to_string(),
            format!("http://127.0.0.1:{}/", ai.mcp.port),
        )]
    } else {
        Vec::new()
    };
    let cwd = ai.acp.and_then(|acp| acp.cwd).map(PathBuf::from);

    let info = connection
        .new_session(cwd, mcp_http_servers)
        .await
        .map_err(|e| e.to_string())?;
    state.sessions.lock().insert(node_id, info.clone());
    Ok(start_result(&info, mcp_enabled))
}

/// Run one prompt turn for a node's session and return the stop reason.
///
/// # Errors
/// Returns an error if the node has no session or the turn fails.
#[tauri::command]
pub(crate) async fn acp_prompt(
    state: State<'_, AcpState>,
    node_id: String,
    text: String,
) -> Result<String, String> {
    let session_id = session_id_for(&state, &node_id)?;
    let connection = running_connection(&state).await?;
    connection
        .prompt(session_id, text)
        .await
        .map_err(|e| e.to_string())
}

/// Switch a node's session mode (plan / accept-edits / manual).
///
/// # Errors
/// Returns an error if the node has no session or the agent rejects the mode.
#[tauri::command]
pub(crate) async fn acp_set_mode(
    state: State<'_, AcpState>,
    node_id: String,
    mode_id: String,
) -> Result<(), String> {
    let session_id = session_id_for(&state, &node_id)?;
    let connection = running_connection(&state).await?;
    connection
        .set_mode(session_id, mode_id)
        .await
        .map_err(|e| e.to_string())
}

/// Cancel a node's in-flight turn.
///
/// # Errors
/// Returns an error if the node has no session.
#[tauri::command]
pub(crate) async fn acp_cancel(state: State<'_, AcpState>, node_id: String) -> Result<(), String> {
    let session_id = session_id_for(&state, &node_id)?;
    let connection = running_connection(&state).await?;
    connection
        .cancel(session_id)
        .await
        .map_err(|e| e.to_string())
}

/// Answer a pending permission prompt. `option_id` is the chosen option, or
/// `None` to cancel the request.
#[tauri::command]
pub(crate) fn acp_permission_respond(
    state: State<'_, AcpState>,
    id: u64,
    option_id: Option<String>,
) {
    if let Some(tx) = state.pending.lock().remove(&id) {
        let _ = tx.send(option_id);
    }
}

/// Tear down the agent subprocess and all sessions. Dropping the connection
/// SIGKILLs the child.
#[tauri::command]
pub(crate) async fn acp_stop(state: State<'_, AcpState>) -> Result<(), String> {
    state.sessions.lock().clear();
    *state.connection.lock().await = None;
    Ok(())
}
