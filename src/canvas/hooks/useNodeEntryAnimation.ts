import { useAtomValue } from "jotai";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sessionStateAtom } from "../../multiplayer/state";
import { activePageIdAtom, loadEpochAtom } from "../state";
import type { AppNode } from "../types";
import { mergeClass } from "./useSelectionHighlight";

// pk-node-in 0.6s; pk-glow-pop 0.9s + 0.12s delay
const ENTRY_TOTAL_MS = 1100;

const EMPTY: ReadonlySet<string> = new Set();

type PageLedger = { epoch: number; pageId: string; seen: Set<string> };
type CacheEntry = { source: AppNode; styled: AppNode };

/**
 * Tags nodes that are genuinely new to the page since load with a
 * `node-entering` className so node.css can play the entry animation.
 *
 * The canvas renders with `onlyRenderVisibleElements`, so node components
 * mount every time they pan into view — a CSS-on-mount animation would replay
 * on every pan and fire for the whole document on load. Instead, node ids are
 * diffed against a seen-set scoped to the current (loadEpoch, activePageId),
 * which also keeps load, page switches, and undo/redo restores silent. The
 * class is a render-time decoration (never written back to the atoms) and is
 * stripped once the animation has played.
 */
export function useNodeEntryAnimation(nodes: AppNode[]): AppNode[] {
  const loadEpoch = useAtomValue(loadEpochAtom);
  const activePageId = useAtomValue(activePageIdAtom);
  const session = useAtomValue(sessionStateAtom);
  // Join/reconnect syncs stream the whole document as remote puts — seed those
  // ids silently instead of animating a wall of nodes. Once the session is
  // active, incremental peer inserts animate like local ones.
  const bulkRemote = session !== null && session.status !== "active";

  const ledgerRef = useRef<PageLedger | null>(null);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const cacheRef = useRef(new Map<string, CacheEntry>());
  const [enteringIds, setEnteringIds] = useState<ReadonlySet<string>>(EMPTY);

  // useLayoutEffect so the class lands before the new node's first paint — a
  // plain effect would flash one full-opacity frame and then restart the
  // animation from zero.
  useLayoutEffect(() => {
    const ledger = ledgerRef.current;
    if (ledger === null || ledger.epoch !== loadEpoch || ledger.pageId !== activePageId) {
      // Fresh document or page switch: everything on screen is pre-existing.
      ledgerRef.current = {
        epoch: loadEpoch,
        pageId: activePageId,
        seen: new Set(nodes.map(node => node.id)),
      };
      setEnteringIds(previous => (previous.size === 0 ? previous : EMPTY));
      return;
    }
    const entering: string[] = [];
    for (const node of nodes) {
      if (ledger.seen.has(node.id)) {
        continue;
      }
      ledger.seen.add(node.id);
      // Draw strokes already appear via the LiveStroke overlay; a pop at
      // stroke-finalize would make that handoff hiccup.
      if (node.type !== "draw" && !bulkRemote) {
        entering.push(node.id);
      }
    }
    if (entering.length === 0) {
      return;
    }
    setEnteringIds(previous => new Set([...previous, ...entering]));
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      setEnteringIds(previous => {
        const next = new Set(previous);
        for (const id of entering) {
          next.delete(id);
        }
        return next.size === 0 ? EMPTY : next;
      });
    }, ENTRY_TOTAL_MS);
    timersRef.current.add(timer);
  }, [nodes, loadEpoch, activePageId, bulkRemote]);

  // Timers are batch-scoped, not effect-scoped: the detection effect re-runs
  // on every nodes change (drag ticks), so clearing in its cleanup would
  // cancel the class removal and leave nodes permanently marked as entering.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, []);

  if (enteringIds.size === 0) {
    return nodes;
  }
  // Same reference-stability cache as useSelectionHighlight: hand React Flow
  // the identical styled object while the source is unchanged so an entering
  // node doesn't force re-renders of untouched siblings.
  return nodes.map(node => {
    if (!enteringIds.has(node.id)) {
      return node;
    }
    const className = mergeClass(node.className, "node-entering");
    const cached = cacheRef.current.get(node.id);
    if (cached && cached.source === node && cached.styled.className === className) {
      return cached.styled;
    }
    const styled = { ...node, className };
    cacheRef.current.set(node.id, { source: node, styled });
    return styled;
  });
}
