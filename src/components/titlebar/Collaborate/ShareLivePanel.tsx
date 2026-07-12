import { CopyButton } from "@mantine/core";
import { IconAppWindow, IconCheck, IconTicket, IconWorld, IconX } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { participantsAtom } from "../../../multiplayer/state";
import type { SessionState } from "../../../multiplayer/types";
import { ShareLiveHeader } from "./ShareLiveHeader";
import { ShareParticipantList } from "./ShareParticipantList";
import { useCollaborateActions } from "./useCollaborateActions";
import { Tooltip } from "../../Tooltip/Tooltip";

interface Props {
  session: SessionState;
  onClose?: () => void;
}

export function ShareLivePanel({ session, onClose }: Props) {
  const participants = useAtomValue(participantsAtom);
  const { busy, endSession } = useCollaborateActions({ onClose });

  const peerEntries = Object.values(participants).filter(p => p.author !== session.myAuthor);
  const collaboratorCount = 1 + peerEntries.length;
  const inviteUrl = `peek://invite/${session.ticket}`;
  const webUrl = `https://getpeek.dev/join/${session.ticket}`;

  return (
    <div className='collab-panel'>
      <ShareLiveHeader session={session} />

      <section className='collab-section'>
        <div className='collab-ticket-row'>
          <CopyButton value={inviteUrl} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip label='App link'>
                <button type='button' className='collab-copy-button' onClick={copy}>
                  {copied ? (
                    <>
                      <IconCheck size={13} stroke={1.75} /> Copied
                    </>
                  ) : (
                    <>
                      <IconAppWindow size={13} stroke={2} /> peek://
                    </>
                  )}
                </button>
              </Tooltip>
            )}
          </CopyButton>
          <CopyButton value={webUrl} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip label='Web link'>
                <button type='button' className='collab-copy-button' onClick={copy}>
                  {copied ? (
                    <>
                      <IconCheck size={13} stroke={1.75} /> Copied
                    </>
                  ) : (
                    <>
                      <IconWorld size={13} stroke={2} /> getpeek.dev
                    </>
                  )}
                </button>
              </Tooltip>
            )}
          </CopyButton>
          <CopyButton value={session.ticket} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip label='Copy ticket'>
                <button type='button' className='collab-copy-button' onClick={copy}>
                  {copied ? (
                    <>
                      <IconCheck size={13} stroke={1.75} /> Copied
                    </>
                  ) : (
                    <>
                      <IconTicket size={13} stroke={2} /> Ticket
                    </>
                  )}
                </button>
              </Tooltip>
            )}
          </CopyButton>
        </div>
      </section>

      <div className='collab-divider' />

      <ShareParticipantList
        session={session}
        peers={peerEntries}
        count={collaboratorCount}
        onClose={onClose}
      />

      <button type='button' className='collab-end-button' onClick={endSession} disabled={busy}>
        <IconX size={14} stroke={2} />
        <span>End session</span>
      </button>
    </div>
  );
}
