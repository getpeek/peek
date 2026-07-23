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

use crate::config::{AcpConfig, PeekConfig};

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

/// Build the spawn config, resolving the command to an absolute path first.
///
/// macOS/Linux apps launched from the Dock/Finder inherit a stripped `PATH`
/// (`/usr/bin:/bin:…`) that omits Homebrew, nvm, Volta, etc., so the configured
/// command (`npx` by default) can't be found — the subprocess then dies before
/// `initialize` with a cryptic `os error 2`. We build a search path from the
/// login shell's `PATH` plus the well-known locations a GUI launch drops,
/// resolve the command against it, and hand the child the same `PATH` so a
/// wrapper launcher (`npx` → `node`) can find its own dependencies. Under
/// `tauri dev` the inherited `PATH` already works, so this only refines it.
///
/// # Errors
/// Returns an error if a bare command can't be found on the search path, so the
/// node surfaces an actionable message instead of a downstream `os error 2`.
async fn build_spawn_config(acp: AcpConfig) -> Result<AcpSpawnConfig, String> {
    let mut env: Vec<(String, String)> = acp.env.into_iter().collect();
    let search_path = resolved_search_path().await;

    // Respect a PATH the user pinned in `ai.acp.env`; otherwise give the child
    // the recovered one so `npx` can in turn resolve `node`.
    if !env.iter().any(|(key, _)| key == "PATH") {
        env.push(("PATH".to_string(), search_path.clone()));
    }

    Ok(AcpSpawnConfig {
        command: resolve_command(&acp.command, &search_path)?,
        args: acp.args,
        env,
    })
}

/// Resolve the agent command to an absolute path. A command that already
/// contains `/` is a path and used verbatim; a bare name is looked up on
/// `search_path`. Erroring for an unresolvable bare name (rather than spawning
/// it and hitting `os error 2`) lets the node tell the user what to fix.
fn resolve_command(command: &str, search_path: &str) -> Result<String, String> {
    if command.contains('/') {
        return Ok(command.to_string());
    }
    resolve_in_path(command, search_path).ok_or_else(|| {
        format!(
            "Couldn't find `{command}` on your PATH. Install it, or set `ai.acp.command` to an absolute path in settings."
        )
    })
}

/// The directories to search for the agent command, and the `PATH` handed to the
/// child: the login shell's `PATH`, then Peek's own inherited `PATH`, then the
/// fallbacks a GUI launch strips — de-duplicated, first occurrence wins.
///
/// Folding in the inherited `PATH` keeps the child's environment a superset of
/// Peek's own, so essentials like `/bin` (the `sh` that `npm` shells out to) are
/// always present even when the login probe fails; the probe and fallbacks then
/// add Homebrew/nvm so `npx` itself resolves. Because it's a superset, overriding
/// the child's `PATH` is never worse than inheriting it (which is what made
/// `tauri dev` work before).
async fn resolved_search_path() -> String {
    let login = login_shell_path().await.unwrap_or_default();
    let inherited = std::env::var("PATH").unwrap_or_default();
    let mut dirs: Vec<String> = Vec::new();
    for dir in login
        .split(':')
        .chain(inherited.split(':'))
        .map(str::to_string)
        .chain(fallback_path_dirs())
    {
        if !dir.is_empty() && !dirs.contains(&dir) {
            dirs.push(dir);
        }
    }
    dirs.join(":")
}

/// Directories to search even when neither the login-shell probe nor the
/// inherited `PATH` lists them: the Homebrew/version-manager dirs a Dock/Finder
/// launch strips, plus the base system dirs so `sh`, `env`, … always resolve.
fn fallback_path_dirs() -> Vec<String> {
    let mut dirs = vec![
        "/opt/homebrew/bin".to_string(),
        "/opt/homebrew/sbin".to_string(),
        "/usr/local/bin".to_string(),
    ];
    if let Ok(home) = std::env::var("HOME") {
        for suffix in [".volta/bin", ".local/bin", ".cargo/bin"] {
            dirs.push(format!("{home}/{suffix}"));
        }
    }
    // Base system dirs last, so a wrapper the user actually uses wins, but `sh`
    // and friends still resolve if everything else somehow omits them.
    for dir in ["/usr/bin", "/bin", "/usr/sbin", "/sbin"] {
        dirs.push(dir.to_string());
    }
    dirs
}

/// The user's real `PATH`, read from their login shell. `None` when `$SHELL` is
/// unset (e.g. Windows, where GUI apps already inherit the full `PATH`) or the
/// probe fails or times out; callers then fall back to [`fallback_path_dirs`].
async fn login_shell_path() -> Option<String> {
    let shell = std::env::var("SHELL").ok()?;
    // Fence the value in sentinels so rc-file chatter (greetings, async prompt
    // plugins) printed around our line can't be mistaken for the PATH, and cap
    // the wait so a shell that blocks on init can't hang agent-node creation.
    let output = tokio::time::timeout(
        Duration::from_secs(5),
        tokio::process::Command::new(shell)
            .args([
                "-ilc",
                "printf '__PEEK_PATH_BEGIN__%s__PEEK_PATH_END__' \"$PATH\"",
            ])
            .output(),
    )
    .await
    .ok()?
    .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let start = stdout.find("__PEEK_PATH_BEGIN__")? + "__PEEK_PATH_BEGIN__".len();
    let end = stdout[start..].find("__PEEK_PATH_END__")? + start;
    let path = stdout[start..end].trim();
    (!path.is_empty()).then(|| path.to_string())
}

/// Find a bare command name on `path`, returning its absolute location, or
/// `None` if nothing matches.
fn resolve_in_path(command: &str, path: &str) -> Option<String> {
    path.split(':')
        .map(|dir| std::path::Path::new(dir).join(command))
        .find(|candidate| candidate.is_file())
        .map(|candidate| candidate.to_string_lossy().into_owned())
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
    let config = build_spawn_config(acp).await?;
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
    // Default the session root to Peek's own `~/peek` dir when the user hasn't
    // set `ai.acp.cwd`; a packaged app's `current_dir()` (the crate's last-resort
    // fallback) would otherwise be `/` or the bundle.
    let cwd = ai
        .acp
        .and_then(|acp| acp.cwd)
        .map(PathBuf::from)
        .or_else(|| PeekConfig::config_dir().ok());

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
