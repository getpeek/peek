# Porting the Peek frontend to GPUI — feasibility study

**Scope:** camera + infinite canvas + panning/zooming only. Node internals (Monaco, chat
streams, result tables, …) are deliberately out of scope, though the biggest tradeoffs they
impose are flagged at the end. Research snapshot: July 2026.

**Verdict: feasible, and the performance thesis is sound — but it is a rewrite, not a port,
and the canvas engine itself is the part we would own.** The recommended next step is a
~2-week standalone spike (Phase 0 below) that proves the camera/canvas core at 120 fps
before committing to anything larger.

---

## 1. Why the camera stutters today

The current pan/zoom implementation is not ours — it is `@xyflow/react`'s embedded d3-zoom
engine. Our code only configures it (`src/canvas/ReactFlowCanvas.tsx:224-248`) and mirrors
the settled viewport into `viewportAtom` on `onMoveEnd`. During a pan, React Flow applies a
single CSS `transform: translate(…) scale(…)` to the pane, so the browser's compositor does
the actual camera work.

That architecture is already close to optimal *for a DOM renderer*, and the codebase has
accumulated a full set of mitigations:

- `onlyRenderVisibleElements` (viewport culling of nodes),
- `data-interacting` DOM attribute that strips shadows/transitions during gestures
  (`useInteractionState.ts`),
- live zoom written to a `--pk-zoom` CSS var instead of React state (`useZoomVariable.ts`),
- per-frame `useStore(transform)` subscriptions gated behind "is there anything to draw"
  wrappers (`WayfindingLayer`, `RemoteCursorsLayer`),
- rubber-band selection coalesced to one rAF and driven through the DOM.

The residual jank therefore comes from the costs a browser cannot avoid: compositing large
node subtrees (Monaco instances, result tables) under a scaling transform, layer
promotion/rasterization churn when zoom changes (a scale transform invalidates rasterized
layers, forcing re-raster of node content at the new scale), culling-driven mount/unmount of
React subtrees mid-gesture, and GC pauses. These are exactly the costs a GPU-immediate
renderer eliminates, so the motivation for GPUI is real — but note the ceiling: **an
empty-canvas pan is already cheap today; the wins come from node content, which is the part
this study scopes out.** Any spike must therefore benchmark with realistic node counts and
node-sized content, not bare rectangles alone.

## 2. State of GPUI and gpui-component (July 2026)

### GPUI (zed-industries)

- **Licensing/availability:** Apache-2.0. Published on crates.io as `gpui` 0.2.2
  (Oct 2025) — but that release is badly stale. Everything below landed on zed `main`
  after it, so **a real project today means a git dependency on the zed monorepo** and
  absorbing pre-1.0 breaking changes (the README says so explicitly). The framework was
  recently split into `gpui` + `gpui_platform` / `gpui_macos` / `gpui_windows` /
  `gpui_linux` / `gpui_web` / `gpui_wgpu`.
- **Platforms:** Metal on macOS, DirectX 11 on Windows, and — since Feb 2026
  ([zed#46758](https://github.com/zed-industries/zed/pull/46758)) — a wgpu/Vulkan renderer
  on Linux that replaced Blade and fixed the notorious NVIDIA/Wayland freezes. An
  experimental **WebGPU/wasm target** (`gpui_web`) merged Feb 2026
  ([zed#50228](https://github.com/zed-industries/zed/pull/50228)) — too early to plan
  around, but a potential long-term path for the peek-web guest client.
- **Rendering model:** hybrid immediate/retained — views rebuild element trees on
  `cx.notify()`, layout runs through Taffy, and the whole window is flattened into a scene
  of GPU primitives (quads, shadows, paths, underlines, sprites) and redrawn "like a
  videogame" at the display refresh rate (120 fps on ProMotion). There is no dirty-region
  repaint, and that is fine for us: pan/zoom invalidates everything anyway. This model is
  GPUI's design center, which is exactly why it fits an infinite canvas.
- **Input:** `ScrollWheelEvent` with precise pixel deltas and `TouchPhase`
  (started/moved/ended), and — since Mar 2026
  ([zed#47351](https://github.com/zed-industries/zed/pull/47351)) — a first-class
  `PinchEvent` with `on_pinch(…)`, now emitted by all four backends (macOS magnify,
  Windows DirectManipulation, Wayland pointer-gestures, X11). **Pinch is git-only; crates.io
  0.2.2 does not have it.** Rotation gestures remain open.
- **Drawing:** `paint_quad` (rounded corners, borders, blurred box-shadows), lyon-backed
  `PathBuilder` for Bezier paths (edges!), sprites/SVG, content masks for clipping, and a
  `canvas(prepaint, paint)` escape hatch. There is **no camera/subtree transform matrix** —
  zoom is implemented by scaling your own coordinates during layout/paint each frame, which
  is what Zed's own image viewer does for pinch zoom.
- **Accessibility:** AccessKit integration landed on `main` in 2026 (per-frame a11y tree,
  screen-reader activation callbacks). New, and Linux support lags, but no longer absent.

### gpui-component (longbridge)

Apache-2.0, ~12k stars, v0.5.1 (Feb 2026), shipping in production (Longbridge Pro trading
terminal). 60+ components: dock/tiled layout with serialization, virtualized
table/list/tree, charts/plots, forms, menus, title bar — a good match for everything
*around* the canvas. Since 0.5.0 it also ships a rope + tree-sitter + LSP **code editor**
claiming stability to 200K lines — the realistic Monaco substitute for query nodes.
It depends on gpui from git (zed main, unpinned), so it inherits — and to some degree
buffers us from — the API churn. A separate `gpui-wry` crate embeds a Wry webview, but as a
native overlay *above* the GPUI scene (the same airspace problem as Electron/Tauri overlays).

**Critically, neither gpui nor gpui-component ships anything canvas- or node-graph-like.**
Community proof-of-concepts exist — `gpui-flow` ("react flow for GPUI": cursor-anchored
zoom, pinch, minimap, culling; ~1 commit, 22 stars), `ferrum-flow` (alpha, pinned to the
stale crates.io gpui), `gpui-whiteboard` (active but GPL-3.0, license-incompatible) — so
the pattern is proven three times over, but there is **no dependency-grade react-flow
equivalent. We would build and own the canvas engine.** That is the single most important
finding of this study.

## 3. What we would have to rebuild

The reduced scope ("just the camera") still decomposes into two very different piles.

### 3a. The camera core — small and well-understood

Everything d3-zoom currently does for us. This is genuinely modest — a few hundred lines of
math plus input plumbing:

| Behavior | Today (React Flow config) | GPUI equivalent |
| --- | --- | --- |
| Viewport state | `{ x, y, zoom }` per page, in `viewportAtom` | `Camera { x: f32, y: f32, zoom: f32 }` on the canvas entity, same per-page persistence (the document JSON schema does not change) |
| Trackpad/wheel pans (never zooms) | `panOnScroll`, `zoomOnScroll: false` | `on_scroll_wheel`: apply pixel delta to `x/y`; `TouchPhase` gives gesture begin/end for the interaction state |
| Pinch zooms, anchored at cursor | `zoomOnPinch` | `on_pinch`: `zoom' = clamp(zoom * (1 + delta), 0.1, 4.0)`; `x' = cx − (cx − x)·(zoom'/zoom)` (same for y), with `cx,cy` the cursor position |
| Drag-pan on middle/right button, Space+drag | `panOnDrag: [1, 2]`, `panActivationKeyCode` | mouse down/move/up handlers + key state |
| Zoom clamp 0.1–4.0 | `minZoom`/`maxZoom` | one `clamp` |
| Camera lock | `cameraLockedAtom` gating all of the above | a bool on the entity |
| screen↔flow projection | `rf.screenToFlowPosition` | `flow = (screen − t) / zoom` — we already hand-roll the inverse (`x*tz+tx`) in `jump/labels.ts` and `RemoteCursorsLayer` |
| Animated `setCenter`/`fitView`/`zoomTo` (the whole `CanvasApi` in `canvas/state.ts:252-290`) | d3-zoom transitions | `request_animation_frame` loop interpolating the camera (respect `reduce_motion`); ~a day of work |
| Momentum/inertia after trackpad pan | d3-zoom | either drop it (React Flow's is subtle) or use gpui's new `gestures.rs` pan-with-momentum tuning |

Risk: **low.** All primitives exist on zed `main`; Zed's image viewer and the three
community canvases are working references.

### 3b. The canvas around the camera — the actual project

The camera is only useful pointed at something. Even with placeholder nodes, a credible
spike needs:

- **A root canvas element** implementing GPUI's `Element` trait directly
  (`request_layout` / `prepaint` / `paint`), bypassing Taffy for children: node positions
  are flow-space coordinates transformed by the camera each frame, not flexbox.
- **Viewport culling** — replaces `onlyRenderVisibleElements`. Trivial rect test against the
  inverse-camera viewport; nodes outside it are never laid out or painted. (This is also
  where GPUI beats the DOM: culling in/out has no mount/unmount cost.)
- **Background grid/dots** (`CanvasBackground`) — a shader-free version is just painted
  quads/paths in screen space modulated by zoom.
- **Floating Bezier edges** — `PathBuilder` port of the current `floating` edge type.
- **Hit-testing, node drag, selection** — flow-space point/rect tests (we already do exactly
  this in `useRubberBandSelect`/`useLassoSelect`), plus GPUI mouse-event routing on the
  custom element.
- **Zoom-invariant overlays** — selection rings, remote cursors, jump labels, wayfinding
  beacons all draw in *screen* space over flow-space anchors. Today that's `--pk-zoom` CSS
  and manual `x*tz+tx` projection; in GPUI it's simply "don't multiply by zoom when
  painting these" — arguably *simpler* than the current DOM gymnastics.
- **Scroll fallthrough** — `useScrollFallthrough` (inner scrollable content absorbs wheel
  before the canvas pans) must be re-invented on GPUI's event propagation. GPUI's scroll
  handling and event phases support this, but it needs care once real nodes have scrollable
  bodies.

Risk: **moderate.** No single hard problem, but this is thousands of lines we own forever,
replacing a battle-tested library. `gpui-flow` (MIT) is a legitimate reference
implementation to crib from, not a dependency.

### 3c. What the reduced scope explicitly defers (and will dominate a real port)

Honesty section. The camera layer is ~5% of the frontend:

- `src/` is **25,722 lines of TS/TSX** (16,731 under `src/canvas/`), and all of it is UI.
  A full port rewrites essentially all of it in Rust.
- **10 node types**, several wrapping Monaco (`@monaco-editor/react`) — the gpui-component
  editor covers syntax highlighting + LSP (our Rust LSP crate already exists), but it is not
  Monaco. Chat/AI nodes currently use `@langchain/ollama` in TS; that logic moves to Rust.
- **Multiplayer** stays easy: viewport is deliberately *not* synced (`multiplayer/diff.ts`),
  cursors are broadcast in flow space and re-projected locally — that model ports 1:1, and
  iroh already lives on the Rust side.
- **The host boundary inverts favorably:** every Tauri `invoke` (DB, storage, LSP, MCP,
  multiplayer) becomes a plain Rust function call. The WASM/IPC bridge — including JSON
  serialization of query results across it — disappears entirely. This is a genuine
  architectural win beyond frame rate.
- **peek-web parity breaks.** The guest client shares conventions and wayfinding/region
  code with the desktop TS client today. A GPUI desktop app ends that code sharing;
  `gpui_web` might eventually close the loop, but it is months-old and experimental.
  Plan for peek-web to remain a separately maintained TS client mid-term.
- **A11y/IME** regress from browser-grade to AccessKit-on-main-grade.

## 4. Recommendation and plan

Proceed, but gate every phase on the previous one's exit criteria. Do not start Phase 2
until Phase 0 has produced numbers.

### Phase 0 — Standalone spike (~1–2 weeks)

New repo/crate (`peek-canvas-spike`), git-pinned to a known-good zed rev, gpui +
gpui-component only. No Peek code.

Build: `Camera` struct + full input handling from §3a (scroll-pan, pinch-zoom anchored at
cursor, drag-pan, Space-pan, clamp, lock), a custom `Element` canvas with culling, dot-grid
background, N draggable rounded-rect "nodes" with text labels and blurred shadows, Bezier
edges, rubber-band selection, and an animated `fit_view`.

**Exit criteria (measure, don't vibe):**
- Sustained 120 fps (macOS ProMotion) / 60 fps (Windows, Linux/Wayland+X11) while
  continuously panning and pinch-zooming a document of **500 and 2,000 nodes** with edges —
  including nodes containing a few paragraphs of laid-out text, since text raster is the
  realistic cost, not quads.
- Cursor-anchored zoom is pixel-stable (the point under the cursor does not drift).
- Trackpad feel is acceptable to the team side-by-side with the current app — this is
  subjective and decisive; d3-zoom's tuning is why React Flow feels good.
- Loads a real Peek document: parse an actual `~/peek/workspaces/**/*.json` (the
  `CanvasDocument`/`PageState` schema, viewport included) and render its nodes as
  placeholder cards. This proves the persistence format carries over unchanged.

**Kill criteria:** frame pacing problems attributable to gpui itself, unusable
Linux/Windows gesture input, or git-dependency breakage that costs more than a day —
any of these, write up findings and stop.

### Phase 1 — Canvas engine crate (~3–4 weeks)

Promote the spike into `peek-canvas` (in-repo crate beside `src-tauri/crates/`): camera,
culling, hit-testing, selection (rubber-band + lasso), node drag with the
`data-interacting`-equivalent quality drop, edges, background, zoom indicator, camera-lock,
the full `CanvasApi` (`zoomToNode`, `panToPoint`, `fitView`, …) as methods, per-page
viewport, undo-friendly document mutation, and serde types for `CanvasDocument` (shared
with existing `storage_commands.rs`). Wire `save`/`load`/autosave (3 s debounce) directly —
no IPC. Exit: a "Peek viewer" binary that opens any existing workspace file and navigates
it natively, dogfooded by the team.

### Phase 2 — Shell + first real node (~4–6 weeks)

gpui-component chrome: custom title bar (`decorations: false` equivalent), dock/panels,
command palette, themes mapped from the `--pk-*` token set. Port **one** node type
end-to-end as the tracer bullet — `Query` (gpui-component editor + our LSP crate + DB
execute + a virtualized result table) exercises every hard subsystem. Exit: create,
edit, run, and persist a query node in the native app.

### Phase 3 — Decision point: full port vs. hybrid vs. stop

Only now, with real data, decide among:
1. **Full port** — remaining 9 node types, multiplayer UI, history, drop-zone, AI nodes.
   Realistic scale: multiple engineer-months; the TS app keeps shipping meanwhile.
2. **Hybrid** — native canvas + `gpui-wry` webviews for the long-tail nodes. Tempting but
   the overlay airspace problem (webviews cover all GPUI content, ignore the camera
   transform during gestures) makes it a poor fit for nodes *on* the canvas; viable only
   for panel-docked content.
3. **Stay on Tauri** — if Phases 0–2 show the win is marginal, fold the learnings back
   into targeted web-side fixes (e.g., freezing node content to bitmaps during gestures).

### Parallel track (cheap, do regardless)

Profile the actual reported jank in the current app with realistic documents
(Chrome tracing during pan/zoom). If it is dominated by re-raster of Monaco/table layers
under scale — the likely culprit — `content-visibility`/raster hints or gesture-time
content freezing may buy meaningful relief for days, not months, of work, and de-risks the
timeline regardless of the port decision.

## 5. Summary of tradeoffs

| | Gain | Cost |
| --- | --- | --- |
| Performance | GPU-immediate whole-scene redraw at 120 fps; culling without mount/unmount; no compositor re-raster on zoom; no GC | We own frame pacing, text layout costs, and every optimization React Flow gave us for free |
| Architecture | IPC/WASM bridge deleted; DB, LSP, MCP, iroh become in-process calls; single language | 25k lines of TS rewritten over time; React 19 + compiler ergonomics lost |
| Portability | One Rust codebase for macOS/Windows/Linux; `gpui_web` as a long-shot future for guests | peek-web parity broken mid-term; pre-1.0 git dependency on zed `main` |
| Ecosystem | gpui-component covers chrome, tables, charts, and a credible LSP editor | No react-flow equivalent (we build it); no Monaco; webview nodes become overlay hacks; a11y/IME regress |

**Bottom line:** the camera/canvas core the user asked about is the *most* feasible part of
the whole idea — every required primitive (pinch events on all backends, precise scroll
phases, path rendering, 120 fps redraw model) exists on zed `main` as of mid-2026, and the
math we'd write is math we already partially hand-roll in `jump/labels.ts` and the cursor
layer. The strategic risks live elsewhere: the unpinned pre-1.0 dependency, owning the
canvas engine forever, and the long tail of node types. Phase 0 answers the performance
question for a week or two of effort; nothing larger should be committed before it runs.
