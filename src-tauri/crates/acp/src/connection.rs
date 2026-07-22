//! A persistent, multi-session ACP client built on `agent-client-protocol`.
//!
//! One [`AcpConnection`] owns one agent subprocess and one JSON-RPC connection,
//! but hosts **many sessions** — one per Agent node — so conversations stay
//! isolated. The crate's connection model runs the whole connection inside a
//! single `connect_with(agent, |cx| async move { … })` future; we keep it alive
//! on a background `tokio` task and pump it with an mpsc command channel.
//!
//! Prompts are dispatched with `cx.spawn` (not awaited inline) so a long turn on
//! one session never blocks session creation, cancellation, or a prompt on
//! another session. `block_task()` is only awaited in the connection foreground
//! (the command loop) or inside `cx.spawn` tasks — never in a notification /
//! permission handler, which would deadlock the dispatch loop.

use std::path::PathBuf;
use std::sync::Arc;

use agent_client_protocol::schema::ProtocolVersion;
use agent_client_protocol::schema::v1::{
    CancelNotification, ContentBlock, EnvVariable, InitializeRequest, McpServer, McpServerHttp,
    McpServerStdio, NewSessionRequest, NewSessionResponse, PromptRequest, RequestPermissionOutcome,
    RequestPermissionRequest, RequestPermissionResponse, SelectedPermissionOutcome, SessionId,
    SessionNotification, SetSessionModeRequest, StopReason, TextContent,
};
use agent_client_protocol::{AcpAgent as AcpAgentTransport, Agent, Client, ConnectionTo, Responder};
use anyhow::{Context, anyhow};
use tokio::sync::{mpsc, oneshot};

use crate::config::AcpSpawnConfig;
use crate::host::AcpHost;

/// A session created on the connection: its ACP id plus the modes it advertised.
#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub session_id: String,
    pub available_modes: Vec<(String, String)>,
    pub current_mode: Option<String>,
}

/// Commands sent from the [`AcpConnection`] handle to the background task.
enum Command {
    NewSession {
        cwd: PathBuf,
        mcp_http_servers: Vec<(String, String)>,
        reply: oneshot::Sender<Result<SessionInfo, String>>,
    },
    Prompt {
        session_id: SessionId,
        text: String,
        reply: oneshot::Sender<anyhow::Result<String>>,
    },
    SetMode {
        session_id: SessionId,
        mode_id: String,
        reply: oneshot::Sender<anyhow::Result<()>>,
    },
    Cancel {
        session_id: SessionId,
        reply: oneshot::Sender<anyhow::Result<()>>,
    },
}

/// A handle to a long-lived agent subprocess hosting many sessions.
///
/// Dropping the handle aborts the background task, which drops the connection
/// future; the transport's child guard then SIGKILLs the subprocess (and its
/// process group), so no explicit kill is needed here.
#[derive(Debug)]
pub struct AcpConnection {
    commands: mpsc::UnboundedSender<Command>,
    task: tokio::task::JoinHandle<()>,
}

impl Drop for AcpConnection {
    fn drop(&mut self) {
        self.task.abort();
    }
}

impl AcpConnection {
    /// Spawn the agent subprocess and run `initialize`, keeping the connection
    /// alive on a background task. Returns once `initialize` succeeds; no session
    /// is created yet (call [`Self::new_session`]).
    ///
    /// # Errors
    /// Returns an error if the subprocess can't be launched or `initialize` fails.
    pub async fn spawn(config: AcpSpawnConfig, host: Arc<dyn AcpHost>) -> anyhow::Result<Self> {
        let transport = build_transport(&config.command, config.args, config.env);

        let (command_tx, command_rx) = mpsc::unbounded_channel::<Command>();
        let (ready_tx, ready_rx) = oneshot::channel::<Result<(), String>>();

        let host_updates = host.clone();
        let host_permissions = host;

        let task = tokio::spawn(async move {
            let result = Client
                .builder()
                .name("peek")
                .on_receive_notification(
                    move |notification: SessionNotification, _cx: ConnectionTo<Agent>| {
                        let host = host_updates.clone();
                        async move {
                            let session_id = notification.session_id.to_string();
                            let update = serde_json::to_value(&notification.update)
                                .unwrap_or(serde_json::Value::Null);
                            host.on_update(session_id, update).await;
                            Ok(())
                        }
                    },
                    agent_client_protocol::on_receive_notification!(),
                )
                .on_receive_request(
                    move |request: RequestPermissionRequest,
                          responder: Responder<RequestPermissionResponse>,
                          _cx: ConnectionTo<Agent>| {
                        let host = host_permissions.clone();
                        async move {
                            let session_id = request.session_id.to_string();
                            let payload =
                                serde_json::to_value(&request).unwrap_or(serde_json::Value::Null);
                            let outcome = match host.request_permission(session_id, payload).await {
                                Some(option_id) => RequestPermissionOutcome::Selected(
                                    SelectedPermissionOutcome::new(option_id),
                                ),
                                None => RequestPermissionOutcome::Cancelled,
                            };
                            responder.respond(RequestPermissionResponse::new(outcome))
                        }
                    },
                    agent_client_protocol::on_receive_request!(),
                )
                .connect_with(transport, async move |cx: ConnectionTo<Agent>| {
                    drive_connection(cx, ready_tx, command_rx).await
                })
                .await;

            if let Err(error) = result {
                eprintln!("ACP connection ended: {error}");
            }
        });

        match ready_rx.await {
            Ok(Ok(())) => Ok(AcpConnection {
                commands: command_tx,
                task,
            }),
            Ok(Err(error)) => Err(anyhow!(error)),
            Err(_) => Err(anyhow!("agent connection closed before initialization completed")),
        }
    }

    /// Open a new session (forwarding the given HTTP MCP servers), returning its
    /// id and advertised modes.
    ///
    /// # Errors
    /// Returns an error if the current directory can't be resolved or the agent
    /// rejects the new session.
    pub async fn new_session(
        &self,
        cwd: Option<PathBuf>,
        mcp_http_servers: Vec<(String, String)>,
    ) -> anyhow::Result<SessionInfo> {
        let cwd = match cwd {
            Some(cwd) => cwd,
            None => std::env::current_dir().context("cannot determine current directory")?,
        };
        let (reply, response) = oneshot::channel();
        self.send(Command::NewSession {
            cwd,
            mcp_http_servers,
            reply,
        })?;
        response
            .await
            .map_err(|_| anyhow!("agent connection dropped the new-session before replying"))?
            .map_err(|error| anyhow!(error))
    }

    /// Send a `session/prompt` and return the stop reason (e.g. `"end_turn"`).
    ///
    /// # Errors
    /// Returns an error if the connection is gone or the prompt turn fails.
    pub async fn prompt(&self, session_id: String, text: String) -> anyhow::Result<String> {
        let (reply, response) = oneshot::channel();
        self.send(Command::Prompt {
            session_id: to_session_id(session_id),
            text,
            reply,
        })?;
        response
            .await
            .map_err(|_| anyhow!("agent connection dropped the prompt before replying"))?
    }

    /// Switch a session's mode (plan / accept-edits / manual).
    ///
    /// # Errors
    /// Returns an error if the connection is gone or the agent rejects the mode.
    pub async fn set_mode(&self, session_id: String, mode_id: String) -> anyhow::Result<()> {
        let (reply, response) = oneshot::channel();
        self.send(Command::SetMode {
            session_id: to_session_id(session_id),
            mode_id,
            reply,
        })?;
        response
            .await
            .map_err(|_| anyhow!("agent connection dropped the set-mode before replying"))?
    }

    /// Cancel a session's in-flight turn.
    ///
    /// # Errors
    /// Returns an error if the connection is gone.
    pub async fn cancel(&self, session_id: String) -> anyhow::Result<()> {
        let (reply, response) = oneshot::channel();
        self.send(Command::Cancel {
            session_id: to_session_id(session_id),
            reply,
        })?;
        response
            .await
            .map_err(|_| anyhow!("agent connection dropped the cancel before replying"))?
    }

    fn send(&self, command: Command) -> anyhow::Result<()> {
        self.commands
            .send(command)
            .map_err(|_| anyhow!("agent connection is no longer running"))
    }
}

/// The connection foreground: run `initialize`, then service commands until every
/// [`AcpConnection`] handle is dropped. Prompts are offloaded with `cx.spawn` so
/// the loop stays responsive across sessions.
async fn drive_connection(
    cx: ConnectionTo<Agent>,
    ready_tx: oneshot::Sender<Result<(), String>>,
    mut command_rx: mpsc::UnboundedReceiver<Command>,
) -> Result<(), agent_client_protocol::Error> {
    if let Err(error) = cx
        .send_request(InitializeRequest::new(ProtocolVersion::V1))
        .block_task()
        .await
    {
        let _ = ready_tx.send(Err(error.to_string()));
        return Err(error);
    }
    let _ = ready_tx.send(Ok(()));

    while let Some(command) = command_rx.recv().await {
        match command {
            Command::NewSession {
                cwd,
                mcp_http_servers,
                reply,
            } => {
                let result = new_session(&cx, cwd, mcp_http_servers)
                    .await
                    .map(|response| session_info(&response))
                    .map_err(|error| error.to_string());
                let _ = reply.send(result);
            }
            Command::Prompt {
                session_id,
                text,
                reply,
            } => {
                let worker = cx.clone();
                let _ = cx.spawn(async move {
                    let result = worker
                        .send_request(PromptRequest::new(
                            session_id,
                            vec![ContentBlock::Text(TextContent::new(text))],
                        ))
                        .block_task()
                        .await
                        .map(|response| stop_reason_string(response.stop_reason))
                        .map_err(|error| anyhow!(error.to_string()));
                    let _ = reply.send(result);
                    Ok(())
                });
            }
            Command::SetMode {
                session_id,
                mode_id,
                reply,
            } => {
                let result = cx
                    .send_request(SetSessionModeRequest::new(session_id, mode_id))
                    .block_task()
                    .await
                    .map(|_| ())
                    .map_err(|error| anyhow!(error.to_string()));
                let _ = reply.send(result);
            }
            Command::Cancel { session_id, reply } => {
                let result = cx
                    .send_notification(CancelNotification::new(session_id))
                    .map_err(|error| anyhow!(error.to_string()));
                let _ = reply.send(result);
            }
        }
    }

    Ok(())
}

async fn new_session(
    cx: &ConnectionTo<Agent>,
    cwd: PathBuf,
    mcp_http_servers: Vec<(String, String)>,
) -> Result<NewSessionResponse, agent_client_protocol::Error> {
    let mut request = NewSessionRequest::new(cwd);
    if !mcp_http_servers.is_empty() {
        request = request.mcp_servers(
            mcp_http_servers
                .into_iter()
                .map(|(name, url)| McpServer::Http(McpServerHttp::new(name, url)))
                .collect(),
        );
    }
    cx.send_request(request).block_task().await
}

fn session_info(response: &NewSessionResponse) -> SessionInfo {
    let (available_modes, current_mode) = match &response.modes {
        Some(modes) => (
            modes
                .available_modes
                .iter()
                .map(|mode| (mode.id.to_string(), mode.name.clone()))
                .collect(),
            Some(modes.current_mode_id.to_string()),
        ),
        None => (Vec::new(), None),
    };
    SessionInfo {
        session_id: response.session_id.to_string(),
        available_modes,
        current_mode,
    }
}

fn to_session_id(session_id: String) -> SessionId {
    SessionId::new(session_id)
}

/// Build the stdio transport, injecting env vars into the child process.
fn build_transport(command: &str, args: Vec<String>, env: Vec<(String, String)>) -> AcpAgentTransport {
    let env_variables: Vec<EnvVariable> = env
        .into_iter()
        .map(|(name, value)| EnvVariable::new(name, value))
        .collect();

    let stdio = McpServerStdio::new(command.to_string(), PathBuf::from(command))
        .args(args)
        .env(env_variables);

    AcpAgentTransport::new(McpServer::Stdio(stdio))
}

/// Convert a [`StopReason`] to its protocol string form (`snake_case`).
fn stop_reason_string(stop_reason: StopReason) -> String {
    serde_json::to_value(stop_reason)
        .ok()
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_else(|| format!("{stop_reason:?}"))
}
