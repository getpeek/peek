import { IconBroadcast } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { multiplayerSyncIssueAtom } from "../../../multiplayer/state";
import type { SessionState } from "../../../multiplayer/types";

// How long a joiner can sit in `connecting` before we tell them sync isn't
// completing. The relay-based gossip path can succeed (so the host's avatar
// shows up) while the iroh-docs sync connection silently fails behind a NAT;
// without this surface the joiner has no clue why their canvas stays empty.
const STUCK_TIMEOUT_MS = 15000;

function subheadFor(
  session: SessionState,
  stuckOnConnecting: boolean,
  syncIssueCount: number,
): string {
  if (session.status === "connecting") {
    if (stuckOnConnecting && session.role === "joiner") {
      return "Sync isn't completing — try ending the session and rejoining.";
    }
    return "Connecting to host…";
  }
  if (session.status === "reconnecting") {
    return session.role === "host"
      ? "Lost contact with peers. Trying to reconnect…"
      : "Lost contact with host. Trying to reconnect…";
  }
  if (syncIssueCount > 0) {
    return "Sync issue: edits may not have propagated.";
  }
  return session.role === "host"
    ? "Anyone with the ticket can edit this canvas in real-time."
    : "Connected to host. Edits sync live.";
}

function pillLabelFor(status: SessionState["status"]): "SYNC" | "RECONNECTING" | "LIVE" {
  if (status === "connecting") {
    return "SYNC";
  }
  if (status === "reconnecting") {
    return "RECONNECTING";
  }
  return "LIVE";
}

interface Props {
  session: SessionState;
}

export function ShareLiveHeader({ session }: Props) {
  const headline = session.role === "host" ? "Sharing canvas" : "In session";
  const isTransient = session.status !== "active";
  const syncIssue = useAtomValue(multiplayerSyncIssueAtom);
  const [stuckOnConnecting, setStuckOnConnecting] = useState(false);

  useEffect(() => {
    if (session.status !== "connecting" || session.role !== "joiner") {
      setStuckOnConnecting(false);
      return;
    }
    const timer = window.setTimeout(() => setStuckOnConnecting(true), STUCK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [session.status, session.role]);

  return (
    <header className='collab-header'>
      <div className='collab-header-icon collab-header-icon--live'>
        <IconBroadcast size={18} stroke={1.75} />
      </div>
      <div className='collab-header-text'>
        <h2>{headline}</h2>
        <p>{subheadFor(session, stuckOnConnecting, syncIssue.count)}</p>
      </div>
      <div className={`collab-live-pill ${isTransient ? "is-connecting" : ""}`}>
        <span className='collab-live-dot' />
        {pillLabelFor(session.status)}
      </div>
    </header>
  );
}
