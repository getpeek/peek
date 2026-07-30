import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, documentAtom } from "../../../canvas/state";
import { initialFromName } from "../../../multiplayer/identity";
import { followingAuthorAtom } from "../../../multiplayer/state";
import type { Peer, SessionState } from "../../../multiplayer/types";
import { Tooltip } from "../../Tooltip/Tooltip";

interface Props {
  session: SessionState;
  peers: Peer[];
}

export function ShareParticipantList({ session, peers }: Props) {
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
        Collaborators <span className='collab-count'>· {peers.length + 1}</span>
      </div>

      <ul className='collab-people'>
        <li className='collab-person'>
          <span className='collab-avwrap'>
            <span className='collab-person-avatar' style={{ backgroundColor: session.myColor }}>
              {initialFromName(session.myName)}
            </span>
          </span>
          <span className='collab-name'>
            {session.myName} <i>{pageNameFor(doc.activePageId)}</i>
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
              className={`collab-person ${known ? "collab-person--clickable" : ""} ${
                isFollowing ? "collab-person--following" : ""
              }`}
              key={p.author}
            >
              <Tooltip label={tooltip}>
                <button
                  type='button'
                  className='collab-person-button'
                  onClick={() => handlePeerClick(p)}
                  disabled={!known}
                >
                  <span className='collab-avwrap'>
                    <span className='collab-person-avatar' style={{ backgroundColor: p.color }}>
                      {initialFromName(p.name)}
                    </span>
                  </span>
                  <span className='collab-name'>
                    {p.name} <i>{known ? pageNameFor(p.currentPageId) : ""}</i>
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
        {peers.length === 0 && (
          <li className='collab-empty'>
            <span className='collab-spinner' />
            Nobody's joined yet
          </li>
        )}
      </ul>
    </section>
  );
}
