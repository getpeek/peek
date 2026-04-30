import { initialFromName } from "../../../multiplayer/identity";
import type { Peer, SessionState } from "../../../multiplayer/types";

interface Props {
  session: SessionState;
  peers: Peer[];
  count: number;
}

export function ShareParticipantList({ session, peers, count }: Props) {
  const isHost = session.role === "host";

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
            {session.myName} <span className='collab-you'>(you)</span>
          </span>
          <span className='collab-role'>{isHost ? "HOST" : "EDITOR"}</span>
        </li>
        {peers.map(p => (
          <li className='collab-row' key={p.author}>
            <span className='collab-avatar' style={{ backgroundColor: p.color }}>
              {initialFromName(p.name)}
              <span className='collab-presence' />
            </span>
            <span className='collab-name'>{p.name}</span>
            <span className='collab-role'>{p.isHost ? "HOST" : "EDITOR"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
