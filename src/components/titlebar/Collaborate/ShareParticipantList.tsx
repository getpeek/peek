import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, documentAtom } from "../../../canvas/state";
import { initialFromName } from "../../../multiplayer/identity";
import { followingAuthorAtom } from "../../../multiplayer/state";
import type { Peer, SessionState } from "../../../multiplayer/types";
import { Tooltip } from "../../Tooltip/Tooltip";

interface Props {
  session: SessionState;
  peers: Peer[];
  count: number;
}

export function ShareParticipantList({ session, peers, count }: Props) {
  const isHost = session.role === "host";
  const doc = useAtomValue(documentAtom);
  const canvasApi = useAtomValue(canvasApiAtom);
  const following = useAtomValue(followingAuthorAtom);
  const setFollowing = useSetAtom(followingAuthorAtom);

  const pageNameFor = (pageId: string) => doc.pages[pageId]?.name ?? "—";

  // Clicking a peer toggles follow-mode. `useFollowPeer` drives the camera from
  // there (initial jump + continuous tracking + page-follow); switching page
  // here just gives immediate feedback. The popover stays open so the row
  // highlight is visible and a second click can stop following.
  const handlePeerClick = (peer: Peer) => {
    if (!canvasApi || !doc.pages[peer.currentPageId]) {
      return;
    }
    if (following === peer.author) {
      setFollowing(null);
      return;
    }
    setFollowing(peer.author);
    canvasApi.switchPage(peer.currentPageId);
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
          const isFollowing = following === p.author;
          const tooltip = isFollowing
            ? `Stop following ${p.name}`
            : known
              ? `Follow ${p.name} on ${pageNameFor(p.currentPageId)}`
              : p.name;
          return (
            <li
              className={`collab-row ${known ? "collab-row--clickable" : ""} ${
                isFollowing ? "collab-row--following" : ""
              }`}
              key={p.author}
            >
              <Tooltip label={tooltip}>
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
                  {isFollowing ? (
                    <span className='collab-following'>Following</span>
                  ) : (
                    <span className='collab-role'>{p.isHost ? "HOST" : "EDITOR"}</span>
                  )}
                </button>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
