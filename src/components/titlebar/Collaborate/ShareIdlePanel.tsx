import { IconAlertCircle, IconShieldLock } from "@tabler/icons-react";
import { ShareHeader } from "./ShareHeader";
import { ShareStatusStrip } from "./ShareStatusStrip";
import { useCollaborateActions } from "./useCollaborateActions";
import { useSessionStatusText } from "./useSessionStatusText";

interface Props {
  onClose?: () => void;
}

export function ShareIdlePanel({ onClose }: Props) {
  const status = useSessionStatusText({ session: null, peerCount: 0 });
  const { busy, ticket, joinError, setTicket, startSession, joinSession } = useCollaborateActions({
    onClose,
  });

  return (
    <>
      <ShareHeader live={false} heading='Collaborate' subhead={status.subhead} />
      <ShareStatusStrip status={status} busy={busy} onToggle={startSession} />

      <section className='collab-section'>
        <div className='collab-label'>Join someone else</div>
        <div className='collab-join-row'>
          <input
            type='text'
            className={`collab-input ${joinError ? "is-bad" : ""}`}
            placeholder='Paste a link or ticket…'
            value={ticket}
            spellCheck={false}
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
        <p className={`collab-hint ${joinError ? "is-bad" : ""}`}>
          {joinError ? (
            <IconAlertCircle size={12} stroke={1.75} />
          ) : (
            <IconShieldLock size={12} stroke={1.75} />
          )}
          {joinError ?? "End-to-end encrypted · tickets expire in 24h"}
        </p>
      </section>
    </>
  );
}
