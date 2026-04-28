# Multiplayer

P2P collaborative editing built on [iroh](https://docs.iroh.computer/quickstart): one user *hosts* a session and shares a ticket; another user *joins* by pasting that ticket, mirrors the host's canvas, and edits alongside them in real time. The host's database is the only one queries run against — joiners observe the streamed results.

## Roles

| Role | DB connection | Autosave | Live query timer | Doc source of truth |
| --- | --- | --- | --- | --- |
| `standalone` (default) | yes | yes (3s debounce → file) | yes | local `documentAtom` |
| `host` | yes | yes | yes | local `documentAtom` ↔ iroh-doc (mirrored) |
| `joiner` | **no** | **no** (suspended) | **no** | iroh-doc ← replicated; restored from snapshot on session end |

`session.role` lives at `src/multiplayer/state.ts:sessionStateAtom`. Role guards are sprinkled in `useAutoSaveDocument`, `useAutoSaveResults`, `useLoadDocument`, `useExecuteQueries`, `QueryNode`'s live-poll effect, and `CustomTitleBar` (which hides the connection picker for joiners).

## Transport (Rust, `src-tauri/src/multiplayer/`)

- **`IrohNode`** (`node.rs`): process-wide singleton lazily created on the first session. Owns `Endpoint`, `MemStore` (blobs), `Gossip`, `Docs`, and a `Router` that wires the three protocols at their respective ALPNs.
- **`MultiplayerSession`** (`session.rs`): per-session struct. Holds the iroh `Doc` handle, the local `AuthorId`, the ticket string, the namespace id, the gossip `Sender`, an `Arc<Notify>` shutdown signal, and join handles for the doc-subscribe / gossip-receive / reconnect loops.
  - On `host()`: creates a doc, sets `DownloadPolicy::EverythingExcept(vec![])` (eager blob fetching — without this, blob bytes don't sync), shares as a `DocTicket`, spawns subscribe + gossip loops. No reconnect task — peers come to the host via the ticket.
  - On `join(ticket)`: parses the `DocTicket`, keeps the full `Vec<EndpointAddr>` (used by the reconnect loop) **and** extracts host endpoint ids for gossip bootstrap, imports the doc, sets eager download policy, spawns subscribe + gossip + reconnect + a one-shot enumerator (covers entries already present at import time, which the live event stream doesn't replay).
  - The doc-subscribe loop keeps a `pending: HashMap<Hash, Vec<(key, author)>>`. If `get_bytes(content_hash)` fails on `InsertRemote` (blob not yet local), the entry is parked. `LiveEvent::ContentReady` drains the pending list once the bytes arrive.
  - The doc-subscribe loop also owns the `NeighborTracker` and translates `LiveEvent::NeighborUp/NeighborDown` into `multiplayer:peer-disconnected` / `multiplayer:peer-reconnected` events (only when the count crosses 0 — the first ever NeighborUp on initial connect is silenced via a `pending_disconnect` flag).
  - The reconnect loop (joiner only) polls the neighbor count on a 3 → 6 → 12 → 30 s backoff. While disconnected, it re-calls `doc.start_sync(bootstrap.clone())` — idempotent and harmless when peers are already connected. iroh-docs only calls `start_sync` once, on `import` (`iroh_docs::api.rs:223`); without this loop, a host endpoint change after laptop sleep / network switch leaves the joiner permanently wedged.
- **Tauri commands** (`multiplayer_commands.rs`): `mp_host_session`, `mp_join_session`, `mp_end_session`, `mp_doc_put`, `mp_doc_del`, `mp_gossip_send`. Eager singleton init via `ensure_node`. State stored on `AppData.iroh: Option<IrohNode>` and `AppData.session: Option<MultiplayerSession>`.

Tauri events emitted from Rust to JS:
- `multiplayer:doc-update` `{key, valueB64, author}`
- `multiplayer:doc-delete` `{key, author}`
- `multiplayer:gossip-recv` `{payload, author}`
- `multiplayer:sync-finished` `{}` (flips joiner from `connecting` → `active`)
- `multiplayer:peer-disconnected` `{}` (last doc-sync neighbor went away — flips status to `reconnecting`)
- `multiplayer:peer-reconnected` `{}` (a doc-sync neighbor came back after a disconnect — flips status to `active`)
- `multiplayer:session-ended` `{}`

## Sync bridge (TypeScript, `src/multiplayer/`)

The frontend keeps two atoms in sync with the iroh-doc through middleware funnels:

- `documentAtom` → wraps `_documentBaseAtom`; calls registered listeners on every non-remote write (`canvas/state.ts`).
- `resultsAtom` → wraps `_resultsBaseAtom`; same pattern.
- `isApplyingRemoteRef` (a synchronous mutable ref, **not an atom**) gates listener notification while remote events are being applied. Atoms can't gate this reliably because React's render cycle isn't synchronous enough.

`useMultiplayer()` (in `syncBridge.ts`, mounted from `App.tsx`) is the single entry point that wires everything:
- `useSyncBridge()` — outbound listeners that diff and push, inbound `multiplayer:doc-update`/`doc-delete`/`sync-finished`/`session-ended` listeners (mounted **once** at app start so they never miss events fired during `mp_join_session`).
- `useGossipBridge()` — handles `multiplayer:gossip-recv`, sends presence heartbeats, prunes stale peers.
- `useMultiplayerControls()` — host/join/end controls; also surfaces them on `window.peekMultiplayer` for devtools testing.

Cursor rendering and broadcast are mounted *inside* `<ReactFlowProvider>` because they need flow-coordinate conversion:
- `useCursorBroadcast()` in `ReactFlowCanvas` — mouse move listener at ~15 Hz.
- `<RemoteCursorsLayer />` — React Flow `Panel`, applies viewport transform manually so cursors track pan/zoom.

## Key scheme (iroh-doc)

| Key | Value | Notes |
| --- | --- | --- |
| `doc/active-page` | UTF-8 page id | activePageId |
| `doc/page-order` | JSON array | pageOrder |
| `pages/<pageId>/name` | UTF-8 string | page name; deleting this key tombstones the page |
| `pages/<pageId>/nodes/<nodeId>` | JSON node | stripped of `selected`/`dragging`/`resizing` |
| `pages/<pageId>/edges/<edgeId>` | JSON edge | stripped of `selected` |
| `results/<nodeId>` | JSON `DatabaseResult` | rows for a result node, lifted out of the document |
| `exec-requests/<requestId>` | JSON `{nodeId, queries}` | joiner→host RPC; host deletes after running |

Viewport is **not** synced — each peer has its own pan/zoom.

Routing is centralized in `keyKind()` (`diff.ts`); all inbound handlers dispatch through it.

## Gossip messages

JSON payloads sent via `mp_gossip_send`. Each recipient gets `{payload, author}` (where `author` is the sender's iroh `EndpointId`).

| `payload.type` | Fields | Cadence |
| --- | --- | --- |
| `cursor` | `flowX`, `flowY`, `pageId` | ~15 Hz on mouse move |
| `presence` | `name`, `color`, `isHost` | every 5 s |
| `leave` | (none) | once on `controls.end()` before `mp_end_session` |

`useGossipBridge` filters out events with `author === session.myAuthor`. Peers and remote cursors that haven't been seen in 15 s are pruned. A `leave` message drops the sender from `participantsAtom` and `remoteCursorsAtom` immediately so the UI reflects a clean disconnect without waiting for the prune.

**Liveness signal.** `participantsAtom[author].lastSeen` is bumped on **both** presence (5 s) and cursor (15 Hz, throttled to once per peer per 2 s) receipts. Without the cursor path, presence is the only liveness signal — and gossip is best-effort, so three dropped presence packets in a row cause spurious 5–10 s prune windows where the participants pill flickers off.

**Per-page cursor filtering.** The cursor payload carries the sender's `documentAtom.activePageId`. `RemoteCursorsLayer` filters cursors whose `pageId` doesn't match the local active page, so peers viewing different pages don't see each other's pointers as ghosts. (Today active page propagates via `doc/active-page` so peers usually converge anyway, but switches have a brief race window where stale cursor positions leak across.)

**Topic isolation.** `app_gossip_topic()` in `session.rs` derives our gossip `TopicId` as `blake3("peek/multiplayer:" || namespace_id)`. Do **not** use `namespace_id.into()` directly — that's the same topic iroh-docs subscribes to internally for live entry propagation, and our JSON payloads would land in iroh-docs' `receive_loop` where `postcard::from_bytes::<Op>(...)?` fails and `?`-s out, killing live sync. Initial reconciliation still works in that broken state (it goes over the docs ALPN), which is why the symptom presents as "first sync OK, edits don't propagate."

## Lifecycle

### Hosting
1. `controls.host()` → `invoke("mp_host_session")` → returns `{ticket, author, namespaceId}`.
2. `setSession({role: 'host', status: 'active', ...})`.
3. `documentToPuts(documentAtom)` and `resultsToPuts(resultsAtom)` push the existing canvas state as `mp_doc_put` operations — without this, the joiner imports an empty doc and only sees future edits.

### Joining
1. `controls.join(ticket)` → snapshots `{document, results}` to `preSessionSnapshotAtom`.
2. Force-flush autosave (`save` + `save_results` invoked synchronously) so the joiner's last edits land on disk.
3. Swap `documentAtom` to `emptyDocument()` and clear `resultsAtom` (with `isApplyingRemoteRef.current = true` to suppress outbound emissions).
4. `invoke("mp_join_session", {ticket})` — Rust imports the doc, sets eager download policy, spawns subscribe + gossip + enumerator.
5. As entries arrive, the always-on `multiplayer:doc-update` listener applies them to `documentAtom` / `resultsAtom`.
6. `multiplayer:sync-finished` fires → status flips to `active`.

### Ending
1. `controls.end()` captures the snapshot up front, then sends a `{type: 'leave'}` gossip message so peers can drop us instantly (best-effort; the gossip task is still alive because `mp_end_session` hasn't run yet).
2. `invoke("mp_end_session")` → Rust drops `MultiplayerSession`; `Drop` aborts subscribe / gossip / reconnect tasks. Errors here are logged and ignored — the JS-side restore must run regardless.
3. If joiner: restore `preSessionSnapshotAtom` (with `isApplyingRemoteRef.current = true`). Document and results return to pre-session state.
4. Clear `sessionStateAtom`, `remoteCursorsAtom`, `participantsAtom`, **then** `preSessionSnapshotAtom` last. Order matters:
   - Clearing `sessionStateAtom` flips `useLoadDocument`'s role check from "joiner: skip" to "no session: load from disk" — but `useLoadDocument` *also* checks `preSessionSnapshotAtom` and bails while it's non-null. That gate is what prevents an async disk-reload from clobbering the snapshot restore in step 3.
   - Clearing `preSessionSnapshotAtom` last is the explicit handoff to disk-load. After this, `useLoadDocument` re-runs and is allowed to read from disk (which by construction matches the snapshot, since `join()` force-flushed disk before swapping).
   The `multiplayer:session-ended` listener clears the same atoms — both paths matter because the Rust side may emit that event independently in the future.

### Reconnecting (joiner)
`useEffect` listeners on `multiplayer:peer-disconnected` / `multiplayer:peer-reconnected` flip `sessionStateAtom.status` between `"active"` and `"reconnecting"`. The Rust reconnect loop is the source of truth — it keeps trying `start_sync` forever until either the neighbor count climbs back above zero or the user clicks End session. There's no auto-give-up: a user who walks away and comes back finds either a healed session or a still-spinning "Reconnecting…" pill that they can manually end. `SharePopover` reuses the existing `is-connecting` CSS class for the pill in the `reconnecting` state and shows a "Lost contact with host. Trying to reconnect…" subhead.

### Query execution
- **Standalone or host**: `useExecuteQueries` calls the regular `executeQueries(canvas, setResults, sourceNode, queries)` — runs against the local DB, creates the result node and updates `resultsAtom`. Both side-effects propagate via the regular outbound listeners.
- **Joiner**: `useExecuteQueries` calls `requestRemoteExecution(nodeId, queries)`, which writes `exec-requests/<requestId>` to the doc. The host's syncBridge sees the doc-update, looks up the source node via `canvasApiAtom`, calls `executeQueries` against the host's DB, then deletes the request entry. Results stream back to the joiner via `results/*` sync.

## Persistence

| File | Owner | Contents |
| --- | --- | --- |
| `~/peek/<workspace>/<connection>.json` | host (and standalone) | `CanvasDocument` |
| `~/peek/<workspace>/<connection>.results.json` | host (and standalone) | `Record<resultNodeId, DatabaseResult>` |

Joiners do not write either file during a session. The pre-session snapshot held in `preSessionSnapshotAtom` is what restores them on session end.

The legacy migration in `useLoadDocument` (`migrateAndHydrate`) lifts any pre-Stage-0 `data.data` field on result nodes into the sidecar, then strips it. Old workspaces upgrade transparently on first load.

## Devtools / debugging

- `window.peekMultiplayer.host()` returns `{ticket, ...}`. Copy the ticket.
- `window.peekMultiplayer.join('<ticket>')` from another `yarn tauri dev` instance.
- `window.peekMultiplayer.end()` to leave or stop hosting.
- Rust logs go to whichever terminal launched `yarn tauri dev`. Useful prefixes: `multiplayer:` (our eprintln!), `iroh::` and `iroh_docs::` (iroh's tracing — enable with `RUST_LOG=iroh=debug,iroh_docs=debug yarn tauri dev`).
- Inspect the on-disk shape: `cat ~/peek/<workspace>/<connection>.json | jq .` and `cat ~/peek/<workspace>/<connection>.results.json | jq 'keys'`.

## Known limitations and TODOs

- **Color palette is two-tone** (`HOST_COLOR` / `JOINER_COLOR` in `syncBridge.ts`). Three+ peers would collide on the joiner color. Easy extension when needed.
- **iroh-docs entries are keyed by `(namespace, author, key)`**, so concurrent writes from two peers to the same key create two entries. We collapse via last-event-wins at `applyOperation` time. Tombstones from one author also don't suppress non-empty entries from another. Fine for the typical "one peer drives at a time" pattern; document if you hit weirdness.
- **Subkey split for query nodes** (`pages/.../nodes/<id>/position` vs `data`) was specced but not built. Today the whole node is one key, so a concurrent drag + SQL-edit on the same query node will drop one writer.
- **`MemStore` for blobs**: no persistence, and the doc grows monotonically (each result re-run is a new entry). If long sessions or large result sets become a problem, switch to `iroh-blobs`'s `fs::Store` and consider stripping `results/*` entries on session end.
- **Undo/redo in session**: not specially handled. Snapshot-based undo replays the entire page's nodes/edges through the doc, which can race with peer edits. Consider disabling undo in session if it becomes a problem.
- **Author identity is per-session** (fresh keypair on every `host()`/`join()`). No cross-session user identity yet.
- **Pinned `pkcs8 = "0.11.0-rc.11"`** in `Cargo.lock` to work around a transient incompatibility with `ed25519-3.0.0-rc.4`. Drop the pin once iroh updates `ed25519-dalek` past the broken pre-release.
- **`Cargo.lock` must be committed** for the pkcs8 pin to survive a clean clone.
- **`ContentReady` fetch errors are logged only** — no retry loop. In practice the eager download policy + iroh's own retries cover this, but if a peer stays disconnected and reconnects, deferred entries may need a manual re-sync.
- **Selection isn't synced**. The plan called this out as a Stage-4 nice-to-have; deferred.

## Where to extend

| Want to add | Edit |
| --- | --- |
| A new doc-level key (e.g., `theme/*`) | `diff.ts` — add to `keyKind()`, extend `diffDocs`/`applyOperation`, add `documentToPuts` lowering if it should land on host start |
| A new ephemeral message type (e.g., `selection`) | `useGossipBridge` in `syncBridge.ts` — add a `payload.type === '...'` branch; sender side: `invoke('mp_gossip_send', {payload: {...}})` |
| A new role-gated behavior | Read `useAtomValue(sessionStateAtom)` in the relevant hook and gate on `session?.role` |
| Persist results across sessions | They already do (sidecar). To skip persisting, read `sessionStateAtom` in `useAutoSaveResults` and gate similarly |
| Disable a feature on joiner | Pattern is everywhere — `if (session?.role === "joiner") return;` early in the effect/handler |

## Stage history

The plan is in `~/.claude/plans/let-s-start-thinking-about-mutable-peach.md`. Implementation order:

- **Stage 0** — Decoupling refactor: extract result rows into `resultsAtom`, wrap `documentAtom` with a write-side middleware funnel.
- **Stage 1** — Rust scaffolding: iroh dependencies, `IrohNode` lazy singleton, `MultiplayerSession`, six Tauri commands, doc subscribe loop emitting events.
- **Stage 2** — Frontend sync bridge: diff/apply, `useMultiplayer`, role guards, joiner state takeover.
- **Stage 3** — Sessions UI: title bar share button, popover with ticket + participants, join modal, command palette entries.
- **Stage 5** *(landed before Stage 4 because the user hit it sooner)* — Results streaming via `results/*` keys, joiner-routed execution via `exec-requests/*` keys.
- **Stage 4** — Cursors and presence over iroh-gossip.
