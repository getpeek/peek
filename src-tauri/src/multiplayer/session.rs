use std::collections::HashMap;
use std::fmt;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::Duration;

use anyhow::Context;
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use bytes::Bytes;
use futures_lite::{Stream, StreamExt};
use iroh::EndpointAddr;
use iroh_blobs::{Hash, store::mem::MemStore};
use iroh_docs::{
    AuthorId, DocTicket, NamespaceId,
    api::{
        Doc,
        protocol::{AddrInfoOptions, ShareMode},
    },
    engine::LiveEvent,
    protocol::Docs,
    store::DownloadPolicy,
};
use iroh_gossip::{
    api::{Event as GossipEvent, GossipReceiver, GossipSender},
    net::Gossip,
    proto::TopicId,
};
use serde_json::Value as JsonValue;
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex as TokioMutex, Notify};
use tokio::task::JoinHandle;

use super::IrohNode;
use super::events::{
    DocDeleteEvent, DocUpdateEvent, GossipRecvEvent, PeerDisconnectedEvent, PeerReconnectedEvent,
    SyncFinishedEvent,
};

/// Tracks how many doc-sync neighbors the local replica is currently connected
/// to. The subscribe loop is the single mutator (via `LiveEvent::NeighborUp`/
/// `NeighborDown`); the reconnect loop reads `count` to decide whether to
/// re-trigger `start_sync`. `pending_disconnect` exists so we don't fire a
/// `peer-reconnected` event on the *initial* sync — only on actual recoveries.
#[derive(Clone)]
struct NeighborTracker {
    count: Arc<AtomicUsize>,
    pending_disconnect: Arc<AtomicBool>,
}

impl NeighborTracker {
    fn new() -> Self {
        Self {
            count: Arc::new(AtomicUsize::new(0)),
            pending_disconnect: Arc::new(AtomicBool::new(false)),
        }
    }

    fn neighbor_up(&self, app: &AppHandle) {
        let prev = self.count.fetch_add(1, Ordering::SeqCst);
        // Only emit a "reconnected" event if we previously emitted a
        // "disconnected" — the first ever NeighborUp on join is just the
        // initial connection, not a recovery.
        if prev == 0 && self.pending_disconnect.swap(false, Ordering::SeqCst) {
            let _ = app.emit("multiplayer:peer-reconnected", PeerReconnectedEvent {});
        }
    }

    fn neighbor_down(&self, app: &AppHandle) {
        // Saturating sub: if iroh emits an unbalanced NeighborDown (shouldn't
        // happen, but defensive), don't underflow.
        let prev = self.count.load(Ordering::SeqCst);
        if prev == 0 {
            return;
        }
        self.count.store(prev - 1, Ordering::SeqCst);
        if prev == 1 {
            self.pending_disconnect.store(true, Ordering::SeqCst);
            let _ = app.emit("multiplayer:peer-disconnected", PeerDisconnectedEvent {});
        }
    }

    fn is_connected(&self) -> bool {
        self.count.load(Ordering::SeqCst) > 0
    }
}

/// Per-session state: a live iroh-doc replica, the author identity used for
/// our writes, and the spawned subscribe loop that ferries remote changes back
/// to the JS frontend.
pub struct MultiplayerSession {
    pub doc: Doc,
    docs: Docs,
    pub author_id: AuthorId,
    pub ticket: String,
    pub namespace_id: NamespaceId,
    gossip_sender: Arc<TokioMutex<GossipSender>>,
    shutdown: Arc<Notify>,
    subscribe_task: Option<JoinHandle<()>>,
    gossip_task: Option<JoinHandle<()>>,
    reconnect_task: Option<JoinHandle<()>>,
}

impl fmt::Debug for MultiplayerSession {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("MultiplayerSession")
            .field("namespace_id", &self.namespace_id)
            .field("author_id", &self.author_id)
            .finish_non_exhaustive()
    }
}

impl MultiplayerSession {
    /// Create a brand new doc on this node and return a session that the host
    /// can share with peers via the resulting ticket string.
    ///
    /// # Errors
    /// Propagates iroh-docs failures from doc creation, author creation, or share.
    pub async fn host(node: &IrohNode, app: AppHandle) -> anyhow::Result<Self> {
        let doc = node.docs.create().await.context("create doc")?;
        let author_id = node.docs.author_create().await.context("create author")?;

        doc.set_download_policy(DownloadPolicy::EverythingExcept(vec![]))
            .await
            .context("set download policy")?;

        // Subscribe BEFORE `share()`. `share()` internally calls
        // `start_sync(doc_id, vec![])` (see iroh-docs `api/actor.rs:doc_share`),
        // which puts the namespace into the syncing state and makes the host
        // willing to accept sync requests. Any `Event::RemoteInsert` fired
        // before our subscriber is attached is dropped by iroh-docs'
        // `Subscribers::send_with` (it's a no-op when the subscriber list is
        // empty — see iroh-docs `sync.rs`). In practice the host has no
        // incoming entries during the initial accept (the joiner starts
        // empty), but subscribing first is symmetric with `join()` and
        // future-proof against scenarios where a peer joins with prior writes.
        let stream = doc.subscribe().await.context("subscribe to doc")?;

        // `RelayAndAddresses` is critical for cross-machine sessions. The
        // default (`Id`) puts only our endpoint id in the ticket and relies on
        // the joiner discovering our addr via the n0 pkarr/dns service the
        // `N0` endpoint preset configures. iroh-docs' single sync connection
        // can tolerate that latency, but iroh-gossip dials each swarm
        // neighbor through the endpoint's address book — and
        // `iroh_docs::engine::live::join_peers` only populates that book from
        // the ticket when the addr info is non-empty (line 472:
        // `if !peer.is_empty() { memory_lookup.add_endpoint_info(peer) }`).
        // Result on Id-only tickets: doc sync connects, gossip never finds a
        // route, and both our app gossip (cursors / presence) and iroh-docs'
        // *live* gossip-driven entry propagation silently fail across NATs.
        let ticket = doc
            .share(ShareMode::Write, AddrInfoOptions::RelayAndAddresses)
            .await
            .context("share doc")?;
        let namespace_id = doc.id();
        let ticket_str = ticket.to_string();

        let shutdown = Arc::new(Notify::new());
        let tracker = NeighborTracker::new();
        let subscribe_task = spawn_subscribe_loop(
            stream,
            node.blobs.clone(),
            app.clone(),
            Arc::clone(&shutdown),
            tracker.clone(),
        );

        let (gossip_sender, gossip_task) = spawn_gossip(
            &node.gossip,
            &namespace_id,
            vec![],
            app,
            Arc::clone(&shutdown),
        )
        .await?;

        // Host has no bootstrap peers — peers come to it via the ticket — so
        // there's nothing to call start_sync against. We still skip spawning
        // the reconnect task entirely for hosts.
        Ok(Self {
            doc,
            docs: node.docs.clone(),
            author_id,
            ticket: ticket_str,
            namespace_id,
            gossip_sender,
            shutdown,
            subscribe_task: Some(subscribe_task),
            gossip_task: Some(gossip_task),
            reconnect_task: None,
        })
    }

    /// Import an existing doc from a ticket string. The doc namespace is shared
    /// with the host; subsequent writes from either side propagate via gossip.
    ///
    /// # Errors
    /// Returns an error if the ticket can't be parsed or the doc can't be imported.
    pub async fn join(node: &IrohNode, ticket_str: &str, app: AppHandle) -> anyhow::Result<Self> {
        let ticket = ticket_str
            .parse::<DocTicket>()
            .context("parse doc ticket")?;
        // Keep two views of the ticket nodes:
        //   - `bootstrap_node_ids` for the gossip subscribe (peer ids only).
        //   - `bootstrap_node_addrs` for `Doc::start_sync`, which needs full
        //     EndpointAddrs and is what the reconnect task re-calls when the
        //     connection drops.
        let DocTicket { capability, nodes } = ticket;
        let bootstrap_node_addrs: Vec<EndpointAddr> = nodes.clone();
        let bootstrap_node_ids: Vec<_> = nodes.iter().map(|addr| addr.id).collect();

        // Use `import_namespace` (which does *not* start sync) instead of
        // `import` (which calls `start_sync` internally — see iroh-docs
        // `api.rs:220`). Subscribing must happen BEFORE sync begins:
        // `Doc::subscribe` only captures events emitted after the subscriber
        // is registered, and iroh-docs' replica subscribers drop events when
        // the list is empty (`Subscribers::send_with` in iroh-docs `sync.rs`
        // is a no-op when `self.0.is_empty()`). With the old `import()` call
        // path, reconciliation could deliver entries between when sync
        // started and when our subscriber attached, and those `RemoteInsert`
        // events were lost — producing "joiner sees an empty doc" bugs that
        // depended on race timing.
        let doc = node
            .docs
            .import_namespace(capability)
            .await
            .context("import namespace")?;
        let author_id = node.docs.author_create().await.context("create author")?;
        let namespace_id = doc.id();

        doc.set_download_policy(DownloadPolicy::EverythingExcept(vec![]))
            .await
            .context("set download policy")?;

        // Subscribe BEFORE `start_sync`. This is the critical ordering that
        // closes the race described above.
        let stream = doc.subscribe().await.context("subscribe to doc")?;

        let shutdown = Arc::new(Notify::new());
        let tracker = NeighborTracker::new();
        let subscribe_task = spawn_subscribe_loop(
            stream,
            node.blobs.clone(),
            app.clone(),
            Arc::clone(&shutdown),
            tracker.clone(),
        );

        let (gossip_sender, gossip_task) = spawn_gossip(
            &node.gossip,
            &namespace_id,
            bootstrap_node_ids,
            app,
            Arc::clone(&shutdown),
        )
        .await?;

        // Kick off sync now that the subscriber is attached. Every entry
        // reconciled from the host fires `Event::RemoteInsert` which our
        // subscribe loop ferries to the JS frontend as `multiplayer:doc-update`.
        doc.start_sync(nodes).await.context("start sync")?;

        let reconnect_task = spawn_reconnect_loop(
            doc.clone(),
            bootstrap_node_addrs,
            tracker,
            Arc::clone(&shutdown),
        );

        Ok(Self {
            doc,
            docs: node.docs.clone(),
            author_id,
            ticket: ticket_str.to_string(),
            namespace_id,
            gossip_sender,
            shutdown,
            subscribe_task: Some(subscribe_task),
            gossip_task: Some(gossip_task),
            reconnect_task: Some(reconnect_task),
        })
    }

    /// Write a key/value entry signed by this session's author.
    ///
    /// # Errors
    /// Propagates the iroh-docs `set_bytes` error.
    pub async fn put(&self, key: &str, value: Vec<u8>) -> anyhow::Result<()> {
        self.doc
            .set_bytes(self.author_id, key.as_bytes().to_vec(), Bytes::from(value))
            .await
            .context("set_bytes")?;
        Ok(())
    }

    /// Delete entries with the given key (single-key delete via prefix).
    ///
    /// # Errors
    /// Propagates the iroh-docs `del` error.
    pub async fn del(&self, key: &str) -> anyhow::Result<()> {
        self.doc
            .del(self.author_id, key.as_bytes().to_vec())
            .await
            .context("del")?;
        Ok(())
    }

    /// Broadcast an ephemeral payload (cursor positions, presence) over the
    /// session's gossip topic. Lossy, fire-and-forget.
    ///
    /// # Errors
    /// Returns an error if the gossip broadcast fails.
    pub async fn send_gossip(&self, payload: JsonValue) -> anyhow::Result<()> {
        let bytes = serde_json::to_vec(&payload).context("serialize gossip payload")?;
        let sender = self.gossip_sender.lock().await;
        sender
            .broadcast(Bytes::from(bytes))
            .await
            .context("gossip broadcast")?;
        Ok(())
    }

    /// Cleanly tear down this session and remove the doc namespace from local
    /// iroh-docs storage. The async counterpart to `Drop` (which can only
    /// abort tasks synchronously). Required for ticket revocation: if we only
    /// drop the handle, the namespace remains in storage and any peer holding
    /// the old ticket can still reconcile against this host.
    ///
    /// # Errors
    /// Propagates `Docs::drop_doc` failures. Closing the doc handle is
    /// best-effort.
    pub async fn shutdown(mut self) -> anyhow::Result<()> {
        self.shutdown.notify_waiters();
        if let Some(handle) = self.subscribe_task.take() {
            handle.abort();
        }
        if let Some(handle) = self.gossip_task.take() {
            handle.abort();
        }
        if let Some(handle) = self.reconnect_task.take() {
            handle.abort();
        }
        let _ = self.doc.close().await;
        self.docs
            .drop_doc(self.namespace_id)
            .await
            .context("drop doc")?;
        Ok(())
    }
}

impl Drop for MultiplayerSession {
    fn drop(&mut self) {
        self.shutdown.notify_waiters();
        if let Some(handle) = self.subscribe_task.take() {
            handle.abort();
        }
        if let Some(handle) = self.gossip_task.take() {
            handle.abort();
        }
        if let Some(handle) = self.reconnect_task.take() {
            handle.abort();
        }
    }
}

/// Derive a gossip topic that's distinct from iroh-docs' internal sync topic.
///
/// iroh-docs subscribes to a gossip topic equal to the namespace id (see
/// `iroh_docs::engine::gossip::GossipState::join` → `subscribe_with_opts(namespace.into(), ...)`).
/// If we shared that topic for our app messages (cursors, presence), our JSON
/// payloads would land in iroh-docs' `receive_loop`, where `postcard::from_bytes::<Op>(&msg.content)?`
/// would fail-and-`?` out of the loop — silently killing live entry propagation.
/// We blake3-hash a prefix + the namespace bytes to get a topic only this app uses.
fn app_gossip_topic(namespace_id: &NamespaceId) -> TopicId {
    let mut buf = Vec::with_capacity(32 + 16);
    buf.extend_from_slice(b"peek/multiplayer:");
    buf.extend_from_slice(namespace_id.as_bytes());
    TopicId::from_bytes(*Hash::new(&buf).as_bytes())
}

async fn spawn_gossip(
    gossip: &Gossip,
    namespace_id: &NamespaceId,
    bootstrap: Vec<iroh::EndpointId>,
    app: AppHandle,
    shutdown: Arc<Notify>,
) -> anyhow::Result<(Arc<TokioMutex<GossipSender>>, JoinHandle<()>)> {
    let topic = app_gossip_topic(namespace_id);
    let topic_handle = gossip
        .subscribe(topic, bootstrap)
        .await
        .context("gossip subscribe")?;
    let (sender, receiver) = topic_handle.split();
    let task = spawn_gossip_recv_loop(receiver, app, shutdown);
    Ok((Arc::new(TokioMutex::new(sender)), task))
}

fn spawn_gossip_recv_loop(
    mut receiver: GossipReceiver,
    app: AppHandle,
    shutdown: Arc<Notify>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            tokio::select! {
                () = shutdown.notified() => break,
                event = receiver.next() => {
                    match event {
                        None => break,
                        Some(Err(e)) => {
                            eprintln!("multiplayer: gossip recv error: {e}");
                        }
                        Some(Ok(GossipEvent::Received(msg))) => {
                            let payload: JsonValue = match serde_json::from_slice(&msg.content) {
                                Ok(v) => v,
                                Err(e) => {
                                    eprintln!("multiplayer: gossip payload parse error: {e}");
                                    continue;
                                }
                            };
                            let _ = app.emit(
                                "multiplayer:gossip-recv",
                                GossipRecvEvent {
                                    payload,
                                    author: format!("{}", msg.delivered_from),
                                },
                            );
                        }
                        Some(Ok(_)) => {
                            // Ignore NeighborUp/Down/Lagged — useful later for
                            // presence diagnostics, but the JS-level heartbeat
                            // covers liveness for v0.
                        }
                    }
                }
            }
        }
    })
}

#[derive(Debug, Clone)]
struct PendingFetch {
    key: String,
    author: String,
}

fn spawn_subscribe_loop<S>(
    stream: S,
    blobs: MemStore,
    app: AppHandle,
    shutdown: Arc<Notify>,
    tracker: NeighborTracker,
) -> JoinHandle<()>
where
    S: Stream<Item = anyhow::Result<LiveEvent>> + Send + Unpin + 'static,
{
    tokio::spawn(async move {
        // Hash → list of (key, author) pairs whose blob hasn't yet arrived.
        // ContentReady drains the entry for that hash.
        let mut pending: HashMap<Hash, Vec<PendingFetch>> = HashMap::new();
        let mut stream = stream;
        loop {
            tokio::select! {
                () = shutdown.notified() => break,
                event = stream.next() => {
                    match event {
                        None => break,
                        Some(Err(e)) => {
                            eprintln!("multiplayer: doc subscribe error: {e}");
                        }
                        Some(Ok(LiveEvent::InsertRemote { from, entry, .. })) => {
                            let key = String::from_utf8_lossy(entry.key()).into_owned();
                            let author = format!("{from}");
                            if entry.content_len() == 0 {
                                let _ = app.emit(
                                    "multiplayer:doc-delete",
                                    DocDeleteEvent { key, author },
                                );
                                continue;
                            }
                            let hash = entry.content_hash();
                            match blobs.get_bytes(hash).await {
                                Ok(bytes) => {
                                    let _ = app.emit(
                                        "multiplayer:doc-update",
                                        DocUpdateEvent {
                                            key,
                                            value_b64: B64.encode(&bytes),
                                            author,
                                        },
                                    );
                                }
                                Err(_) => {
                                    // Blob hasn't synced yet; ContentReady
                                    // will fire once it has, and we'll fetch
                                    // and emit then.
                                    pending
                                        .entry(hash)
                                        .or_default()
                                        .push(PendingFetch { key, author });
                                }
                            }
                        }
                        Some(Ok(LiveEvent::ContentReady { hash })) => {
                            let waiters = pending.remove(&hash);
                            let Some(waiters) = waiters else { continue };
                            match blobs.get_bytes(hash).await {
                                Ok(bytes) => {
                                    let value_b64 = B64.encode(&bytes);
                                    for entry in waiters {
                                        let _ = app.emit(
                                            "multiplayer:doc-update",
                                            DocUpdateEvent {
                                                key: entry.key,
                                                value_b64: value_b64.clone(),
                                                author: entry.author,
                                            },
                                        );
                                    }
                                }
                                Err(e) => {
                                    eprintln!(
                                        "multiplayer: ContentReady fetch failed for {hash}: {e}"
                                    );
                                }
                            }
                        }
                        Some(Ok(LiveEvent::SyncFinished(_))) => {
                            let _ = app.emit("multiplayer:sync-finished", SyncFinishedEvent {});
                        }
                        Some(Ok(LiveEvent::NeighborUp(_peer))) => {
                            tracker.neighbor_up(&app);
                        }
                        Some(Ok(LiveEvent::NeighborDown(_peer))) => {
                            tracker.neighbor_down(&app);
                        }
                        Some(Ok(_)) => {
                            // Ignore InsertLocal (we wrote it) and
                            // PendingContentReady (initial-batch flush signal).
                        }
                    }
                }
            }
        }
    })
}

/// Joiner-only reconnect loop. iroh-docs' `Doc::import` calls `start_sync`
/// once with the ticket's bootstrap peers (`iroh_docs::api.rs` line 220-225),
/// and the gossip layer auto-reconnects via its membership protocol when a
/// neighbor reappears (`iroh_docs::engine::live.rs:305-317`). But if the host
/// rebinds its endpoint (laptop sleep, network switch), the original
/// bootstrap addresses go stale and iroh-docs has nothing to fall back to.
/// This loop polls the neighbor count and, while it's zero, periodically
/// calls `start_sync(bootstrap.clone())` again — which is idempotent and
/// harmless when peers are already connected. Backoff caps at 30 s.
fn spawn_reconnect_loop(
    doc: Doc,
    bootstrap: Vec<EndpointAddr>,
    tracker: NeighborTracker,
    shutdown: Arc<Notify>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        const BACKOFF_STEPS_SECS: [u64; 4] = [3, 6, 12, 30];

        if bootstrap.is_empty() {
            // Should not happen for joiners, but guard against an empty
            // bootstrap list anyway — we have nobody to call start_sync against.
            return;
        }

        let mut step: usize = 0;

        loop {
            let wait = Duration::from_secs(BACKOFF_STEPS_SECS[step]);
            tokio::select! {
                () = shutdown.notified() => break,
                () = tokio::time::sleep(wait) => {}
            }

            if tracker.is_connected() {
                // Doc-sync neighbors are present; reset backoff and keep
                // watching. We don't need to do anything — iroh-docs handles
                // live updates on its own once a neighbor is up.
                step = 0;
                continue;
            }

            match doc.start_sync(bootstrap.clone()).await {
                Ok(()) => {
                    eprintln!(
                        "multiplayer: reconnect start_sync issued (still no neighbors after {wait:?})"
                    );
                }
                Err(e) => {
                    eprintln!("multiplayer: reconnect start_sync failed: {e}");
                }
            }
            step = (step + 1).min(BACKOFF_STEPS_SECS.len() - 1);
        }
    })
}
