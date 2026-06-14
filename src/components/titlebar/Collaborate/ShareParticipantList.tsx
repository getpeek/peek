import { useAtomValue } from "jotai";
import { canvasApiAtom, documentAtom } from "../../../canvas/state";
import { initialFromName } from "../../../multiplayer/identity";
import { remoteCursorsAtom } from "../../../multiplayer/state";
import type { Peer, SessionState } from "../../../multiplayer/types";
import { Tooltip } from "../../Tooltip/Tooltip";

interface Props {
  session: SessionState;
  peers: Peer[];
  count: number;
  onClose?: () => void;
}

export function ShareParticipantList({ session, peers, count, onClose }: Props) {
  const isHost = session.role === "host";
  const doc = useAtomValue(documentAtom);
  const canvasApi = useAtomValue(canvasApiAtom);
  const cursors = useAtomValue(remoteCursorsAtom);

  const pageNameFor = (pageId: string) => doc.pages[pageId]?.name ?? "—";

  const handlePeerClick = (peer: Peer) => {
    if (!canvasApi || !doc.pages[peer.currentPageId]) {
      return;
    }
    canvasApi.switchPage(peer.currentPageId);
    const cursor = cursors[peer.author];
    if (cursor && cursor.pageId === peer.currentPageId) {
      requestAnimationFrame(() =>
        canvasApi.panToPoint(cursor.flowX, cursor.flowY, { duration: 300 }),
      );
    }
    onClose?.();
  };

  return (
    <section className='collab-section'>
      <div className='collab-label'>
        Collaborators · <span className='collab-count'>{count}</span>
      </div>

      <ul className='collab-list'>
        <li className='collab-row'>
          <span className='collab-avatar' style={{ backgroundColor: session.myColor }}>
            {initialFromName(session.myName)}
            <span className='collab-presence' />
          </span>
          <span className='collab-name'>
            {session.myName} <span className='collab-page'>{pageNameFor(doc.activePageId)}</span>
          </span>
          <span className='collab-role'>{isHost ? "HOST" : "EDITOR"}</span>
        </li>
        {peers.map(p => {
          const known = !!doc.pages[p.currentPageId];
          return (
            <li className={`collab-row ${known ? "collab-row--clickable" : ""}`} key={p.author}>
              <Tooltip
                label={known ? `Jump to ${p.name} on ${pageNameFor(p.currentPageId)}` : p.name}
              >
                <button
                  type='button'
                  className='collab-row-button'
                  onClick={() => handlePeerClick(p)}
                  disabled={!known}
                >
                  <span className='collab-avatar' style={{ backgroundColor: p.color }}>
                    {initialFromName(p.name)}
                    <span className='collab-presence' />
                  </span>
                  <span className='collab-name'>
                    {p.name}{" "}
                    <span className='collab-page'>{known ? pageNameFor(p.currentPageId) : ""}</span>
                  </span>
                  <span className='collab-role'>{p.isHost ? "HOST" : "EDITOR"}</span>
                </button>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
