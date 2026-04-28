import { Panel, useStore } from "@xyflow/react";
import { useAtomValue } from "jotai";
import {
  participantsAtom,
  remoteCursorsAtom,
  sessionStateAtom,
} from "./state";
import "./RemoteCursorsLayer.css";

/**
 * Renders one cursor per remote peer using the cached `remoteCursorsAtom`
 * positions. Cursors live in flow space; we apply the local viewport
 * transform manually so they track pan/zoom on this peer.
 */
export function RemoteCursorsLayer() {
  const session = useAtomValue(sessionStateAtom);
  const cursors = useAtomValue(remoteCursorsAtom);
  const participants = useAtomValue(participantsAtom);
  // Subscribe to viewport so we re-render on pan/zoom.
  const transform = useStore((s) => s.transform);

  if (!session) return null;
  const [tx, ty, tz] = transform;

  const entries = Object.entries(cursors).filter(
    ([author]) => author !== session.myAuthor,
  );
  if (entries.length === 0) return null;

  return (
    <Panel position="top-left" className="remote-cursors-panel">
      {entries.map(([author, cur]) => {
        const peer = participants[author];
        const color = peer?.color ?? "#888";
        const name = peer?.name ?? "Peer";
        const screenX = cur.flowX * tz + tx;
        const screenY = cur.flowY * tz + ty;
        return (
          <div
            key={author}
            className="remote-cursor"
            style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              className="remote-cursor-arrow"
              aria-hidden
            >
              <path
                d="M2 2 L2 14 L6 11 L9 16 L11 15 L8 10 L13 10 Z"
                fill={color}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1"
              />
            </svg>
            <span
              className="remote-cursor-label"
              style={{ backgroundColor: color }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </Panel>
  );
}
