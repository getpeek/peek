import { IconLogout } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { participantsAtom } from "../../../multiplayer/state";
import type { SessionState } from "../../../multiplayer/types";
import { ShareHeader } from "./ShareHeader";
import { ShareParticipantList } from "./ShareParticipantList";
import { ShareStatusStrip } from "./ShareStatusStrip";
import { SHARE_TARGET_LABELS, type ShareTargetKey, ShareTargets } from "./ShareTargets";
import { useCollaborateActions } from "./useCollaborateActions";
import { useSessionStatusText } from "./useSessionStatusText";

interface Props {
  session: SessionState;
  onClose?: () => void;
}

export function ShareLivePanel({ session, onClose }: Props) {
  const participants = useAtomValue(participantsAtom);
  const { busy, endSession } = useCollaborateActions({ onClose });
  const [target, setTarget] = useState<ShareTargetKey>("app");

  const isHost = session.role === "host";
  const peers = Object.values(participants).filter(p => p.author !== session.myAuthor);
  const status = useSessionStatusText({
    session,
    peerCount: peers.length,
    targetLabel: SHARE_TARGET_LABELS[target],
  });

  return (
    <>
      <ShareHeader
        live
        heading={isHost ? "Collaborate" : "In a session"}
        subhead={status.subhead}
      />
      <ShareStatusStrip status={status} busy={busy} onToggle={isHost ? endSession : undefined} />

      {isHost && (
        <>
          <section className='collab-section'>
            <div className='collab-label'>Share</div>
            <ShareTargets ticket={session.ticket} selected={target} onSelect={setTarget} />
          </section>
          <div className='collab-divider' />
        </>
      )}

      <ShareParticipantList session={session} peers={peers} />

      {!isHost && (
        <section className='collab-section'>
          <button
            type='button'
            className='collab-leave-button'
            onClick={endSession}
            disabled={busy}
          >
            <IconLogout size={13} stroke={2} />
            <span>Leave session</span>
          </button>
        </section>
      )}
    </>
  );
}
