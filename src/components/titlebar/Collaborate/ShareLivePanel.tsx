import { CopyButton } from "@mantine/core";
import { IconCheck, IconCopy, IconLink, IconX } from "@tabler/icons-react";
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

  return (
    <div className='collab-panel'>
      <ShareLiveHeader session={session} />

      <section className='collab-section'>
        <div className='collab-label'>Invite ticket</div>
        <div className='collab-ticket-row'>
          <code className='collab-ticket'>{session.ticket}</code>
          <CopyButton value={session.ticket} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip label='Copy ticket'>
                <button type='button' className='collab-copy-button' onClick={copy}>
                  {copied ? (
                    <IconCheck size={13} stroke={2} />
                  ) : (
                    <IconCopy size={13} stroke={1.75} />
                  )}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </Tooltip>
            )}
          </CopyButton>
          <CopyButton value={inviteUrl} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip label='Copy invite link'>
                <button
                  type='button'
                  className='collab-copy-button collab-copy-button--icon'
                  onClick={copy}
                  aria-label='Copy invite link'
                >
                  {copied ? (
                    <IconCheck size={14} stroke={2} />
                  ) : (
                    <IconLink size={14} stroke={1.75} />
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
