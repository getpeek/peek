import { IconBroadcast, IconUser } from "@tabler/icons-react";
import { useCollaborateActions } from "./useCollaborateActions";

interface Props {
  onClose?: () => void;
}

export function ShareIdlePanel({ onClose }: Props) {
  const { busy, ticket, joinError, setTicket, startSession, joinSession } = useCollaborateActions({
    onClose,
  });

  return (
    <div className='collab-panel'>
      <header className='collab-header'>
        <div className='collab-header-icon'>
          <IconUser size={18} stroke={1.75} />
        </div>
        <div className='collab-header-text'>
          <h2>Collaborate</h2>
          <p>Host a session to share this canvas, or paste a ticket to join one.</p>
        </div>
      </header>

      <section className='collab-section'>
        <div className='collab-label'>Start a session</div>
        <button type='button' className='collab-host-button' onClick={startSession} disabled={busy}>
          <IconBroadcast size={16} stroke={2} />
          <span>Start hosting</span>
        </button>
      </section>

      <div className='collab-or'>
        <span>or</span>
      </div>

      <section className='collab-section'>
        <div className='collab-label'>Join a session</div>
        <div className='collab-join-row'>
          <input
            type='text'
            className='collab-input'
            placeholder='Paste a ticket…'
            value={ticket}
            onChange={e => setTicket(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                void joinSession();
              }
            }}
            disabled={busy}
            autoFocus
          />
          <button
            type='button'
            className='collab-join-button'
            onClick={joinSession}
            disabled={busy || !ticket.trim()}
          >
            Join
          </button>
        </div>
        {joinError && <div className='collab-error'>{joinError}</div>}
      </section>
    </div>
  );
}
