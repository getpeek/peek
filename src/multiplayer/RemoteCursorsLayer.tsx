import { Panel, useStore } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { documentAtom } from "../canvas/state";
import { participantsAtom, remoteCursorsAtom, sessionStateAtom } from "./state";
import type { Peer, RemoteCursor } from "./types";
import "./RemoteCursorsLayer.css";

/**
 * Renders one cursor per remote peer using the cached `remoteCursorsAtom`
 * positions. Cursors live in flow space; we apply the local viewport
 * transform manually so they track pan/zoom on this peer.
 *
 * Split in two: the gate reads only atoms (no per-frame work) and bails when
 * there's nothing to draw, so the live viewport subscription in `RemoteCursors`
 * only mounts when remote cursors are actually on screen. Solo sessions and
 * peers on other pages pay nothing during pan/zoom.
 */
export function RemoteCursorsLayer() {
  const session = useAtomValue(sessionStateAtom);
  const cursors = useAtomValue(remoteCursorsAtom);
  const participants = useAtomValue(participantsAtom);
  const activePageId = useAtomValue(documentAtom).activePageId;

  if (!session) {
    return null;
  }

  const entries = Object.entries(cursors).filter(
    ([author, cur]) => author !== session.myAuthor && cur.pageId === activePageId,
  );
  if (entries.length === 0) {
    return null;
  }

  return <RemoteCursors entries={entries} participants={participants} />;
}

interface RemoteCursorsProps {
  entries: [string, RemoteCursor][];
  participants: Record<string, Peer>;
}

function RemoteCursors({ entries, participants }: RemoteCursorsProps) {
  // Subscribe to the live viewport so cursors stay glued to canvas content
  // during this peer's own pan/zoom. Frame-accurate by design — throttling
  // would make remote pointers visibly drift behind the canvas.
  const [tx, ty, tz] = useStore(s => s.transform);

  return (
    <Panel position='top-left' className='remote-cursors-panel'>
      {entries.map(([author, cur]) => {
        const peer = participants[author];
        const color = peer?.color ?? "#888";
        const name = peer?.name ?? "Peer";
        const screenX = cur.flowX * tz + tx;
        const screenY = cur.flowY * tz + ty;
        return (
          <div
            key={author}
            className='remote-cursor'
            style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 18 18'
              className='remote-cursor-arrow'
              aria-hidden
            >
              <path
                d='M2 2 L2 14 L6 11 L9 16 L11 15 L8 10 L13 10 Z'
                fill={color}
                stroke='rgba(0,0,0,0.4)'
                strokeWidth='1'
              />
            </svg>
            <span className='remote-cursor-label' style={{ backgroundColor: color }}>
              {name}
            </span>
          </div>
        );
      })}
    </Panel>
  );
}
