import { IconBroadcast } from "@tabler/icons-react";
import type { SessionState } from "../../../multiplayer/types";

function subheadFor(session: SessionState): string {
  if (session.status === "connecting") {
    return "Connecting to host…";
  }
  if (session.status === "reconnecting") {
    return session.role === "host"
      ? "Lost contact with peers. Trying to reconnect…"
      : "Lost contact with host. Trying to reconnect…";
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

  return (
    <header className='collab-header'>
      <div className='collab-header-icon collab-header-icon--live'>
        <IconBroadcast size={18} stroke={1.75} />
      </div>
      <div className='collab-header-text'>
        <h2>{headline}</h2>
        <p>{subheadFor(session)}</p>
      </div>
      <div className={`collab-live-pill ${isTransient ? "is-connecting" : ""}`}>
        <span className='collab-live-dot' />
        {pillLabelFor(session.status)}
      </div>
    </header>
  );
}
