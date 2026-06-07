use std::fmt;
use std::sync::Arc;

use russh::client::{self, Handle};
use russh::keys::{PrivateKeyWithHashAlg, load_secret_key};
use russh::{ChannelMsg, Disconnect};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Notify;
use tokio::task::JoinHandle;

use crate::config::SshTunnelConfig;

struct Client;

impl client::Handler for Client {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

pub(crate) struct SshTunnel {
    local_port: u16,
    shutdown: Arc<Notify>,
    accept_task: Option<JoinHandle<()>>,
    session: Option<Arc<Handle<Client>>>,
}

impl fmt::Debug for SshTunnel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SshTunnel")
            .field("local_port", &self.local_port)
            .finish_non_exhaustive()
    }
}

impl SshTunnel {
    /// Open an SSH tunnel that forwards local TCP connections to `remote_host:remote_port`
    /// through the bastion described by `cfg`.
    ///
    /// # Errors
    ///
    /// Returns an error string if the SSH key cannot be loaded, the bastion is unreachable,
    /// authentication fails, or the local listener cannot be bound.
    pub(crate) async fn open(
        cfg: &SshTunnelConfig,
        remote_host: &str,
        remote_port: u16,
    ) -> Result<Self, String> {
        let key_pair = load_secret_key(&cfg.key_path, None)
            .map_err(|e| format!("Failed to load SSH key {}: {e}", cfg.key_path.display()))?;

        let config = Arc::new(client::Config {
            nodelay: true,
            ..Default::default()
        });

        let mut session = client::connect(config, (cfg.ssh_host.as_str(), cfg.ssh_port), Client)
            .await
            .map_err(|e| {
                format!(
                    "SSH connect to {}:{} failed: {e}",
                    cfg.ssh_host, cfg.ssh_port
                )
            })?;

        let hash_alg = session
            .best_supported_rsa_hash()
            .await
            .map_err(|e| format!("SSH negotiation failed: {e}"))?
            .flatten();

        let auth_res = session
            .authenticate_publickey(
                cfg.ssh_user.clone(),
                PrivateKeyWithHashAlg::new(Arc::new(key_pair), hash_alg),
            )
            .await
            .map_err(|e| format!("SSH auth error: {e}"))?;

        if !auth_res.success() {
            return Err(format!(
                "SSH publickey authentication failed for user {}",
                cfg.ssh_user
            ));
        }

        let listener = TcpListener::bind(("127.0.0.1", cfg.local_port))
            .await
            .map_err(|e| format!("Failed to bind local port {}: {e}", cfg.local_port))?;
        let local_port = listener
            .local_addr()
            .map_err(|e| format!("Failed to read local addr: {e}"))?
            .port();

        let shutdown = Arc::new(Notify::new());
        let session = Arc::new(session);

        let accept_task = spawn_accept_loop(
            listener,
            Arc::clone(&session),
            remote_host.to_string(),
            remote_port,
            local_port,
            Arc::clone(&shutdown),
        );

        Ok(Self {
            local_port,
            shutdown,
            accept_task: Some(accept_task),
            session: Some(session),
        })
    }

    #[must_use]
    pub(crate) fn local_port(&self) -> u16 {
        self.local_port
    }
}

impl Drop for SshTunnel {
    fn drop(&mut self) {
        self.shutdown.notify_waiters();
        if let Some(handle) = self.accept_task.take() {
            handle.abort();
        }
        if let Some(session) = self.session.take() {
            tokio::spawn(async move {
                let _ = session
                    .disconnect(Disconnect::ByApplication, "", "en")
                    .await;
            });
        }
    }
}

fn spawn_accept_loop(
    listener: TcpListener,
    session: Arc<Handle<Client>>,
    remote_host: String,
    remote_port: u16,
    local_port: u16,
    shutdown: Arc<Notify>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            tokio::select! {
                () = shutdown.notified() => break,
                accepted = listener.accept() => {
                    match accepted {
                        Ok((socket, originator)) => {
                            let session = Arc::clone(&session);
                            let remote_host = remote_host.clone();
                            tokio::spawn(async move {
                                if let Err(e) = forward(
                                    socket,
                                    originator.ip().to_string(),
                                    u32::from(originator.port()),
                                    session,
                                    remote_host,
                                    u32::from(remote_port),
                                )
                                .await
                                {
                                    eprintln!("ssh tunnel forward error (local:{local_port}): {e}");
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("ssh tunnel accept error (local:{local_port}): {e}");
                            break;
                        }
                    }
                }
            }
        }
    })
}

async fn forward(
    mut stream: TcpStream,
    originator_addr: String,
    originator_port: u32,
    session: Arc<Handle<Client>>,
    remote_host: String,
    remote_port: u32,
) -> Result<(), String> {
    let mut channel = session
        .channel_open_direct_tcpip(remote_host, remote_port, originator_addr, originator_port)
        .await
        .map_err(|e| format!("channel_open_direct_tcpip: {e}"))?;

    let mut buf = vec![0u8; 65536];
    let mut stream_closed = false;

    loop {
        tokio::select! {
            r = stream.read(&mut buf), if !stream_closed => {
                match r {
                    Ok(0) => {
                        stream_closed = true;
                        channel.eof().await.map_err(|e| format!("channel eof: {e}"))?;
                    }
                    Ok(n) => {
                        channel.data(&buf[..n]).await.map_err(|e| format!("channel data: {e}"))?;
                    }
                    Err(e) => return Err(format!("local read: {e}")),
                }
            }
            msg = channel.wait() => {
                let Some(msg) = msg else { break; };
                match msg {
                    ChannelMsg::Data { ref data } => {
                        stream.write_all(data).await.map_err(|e| format!("local write: {e}"))?;
                    }
                    ChannelMsg::Eof => {
                        if !stream_closed {
                            channel.eof().await.map_err(|e| format!("channel eof: {e}"))?;
                        }
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(())
}
