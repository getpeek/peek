import { CopyButton } from "@mantine/core";
import {
  IconBroadcast,
  IconCheck,
  IconCopy,
  IconShieldLock,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { participantsAtom, sessionStateAtom } from "../multiplayer/state";
import { initialFromName } from "../multiplayer/identity";
import type { MultiplayerControls } from "../multiplayer/syncBridge";
import "./SharePopover.css";

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

interface Props {
  onClose?: () => void;
}

export function SharePopover({ onClose }: Props) {
  const session = useAtomValue(sessionStateAtom);
  const participants = useAtomValue(participantsAtom);
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const startSession = useCallback(async () => {
    setBusy(true);
    try {
      await controls()?.host();
    } catch (e) {
      console.error("host session failed:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  const joinSession = useCallback(async () => {
    const trimmed = ticket.trim();
    if (!trimmed) {
      setJoinError("Paste a ticket to join.");
      return;
    }
    setBusy(true);
    setJoinError(null);
    try {
      await controls()?.join(trimmed);
      setTicket("");
      onClose?.();
    } catch (e) {
      setJoinError(String(e));
    } finally {
      setBusy(false);
    }
  }, [ticket, onClose]);

  const endSession = useCallback(async () => {
    setBusy(true);
    try {
      await controls()?.end();
      onClose?.();
    } catch (e) {
      console.error("end session failed:", e);
    } finally {
      setBusy(false);
    }
  }, [onClose]);

  if (!session) {
    return (
      <div className="collab-panel">
        <header className="collab-header">
          <div className="collab-header-icon">
            <IconUser size={18} stroke={1.75} />
          </div>
          <div className="collab-header-text">
            <h2>Collaborate</h2>
            <p>Host a session to share this canvas, or paste a ticket to join one.</p>
          </div>
        </header>

        <section className="collab-section">
          <div className="collab-label">Start a session</div>
          <button
            type="button"
            className="collab-host-button"
            onClick={startSession}
            disabled={busy}
          >
            <IconBroadcast size={16} stroke={2} />
            <span>Start hosting</span>
          </button>
        </section>

        <div className="collab-or">
          <span>or</span>
        </div>

        <section className="collab-section">
          <div className="collab-label">Join a session</div>
          <div className="collab-join-row">
            <input
              type="text"
              className="collab-input"
              placeholder="Paste a ticket…"
              value={ticket}
              onChange={(e) => {
                setTicket(e.currentTarget.value);
                if (joinError) {
                  setJoinError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void joinSession();
                }
              }}
              disabled={busy}
              autoFocus
            />
            <button
              type="button"
              className="collab-join-button"
              onClick={joinSession}
              disabled={busy || !ticket.trim()}
            >
              Join
            </button>
          </div>
          {joinError && <div className="collab-error">{joinError}</div>}
        </section>

        <footer className="collab-footer">
          <IconShieldLock size={13} stroke={1.75} />
          <span>End-to-end encrypted · tickets expire in 24h</span>
        </footer>
      </div>
    );
  }

  const peerEntries = Object.values(participants).filter((p) => p.author !== session.myAuthor);
  const collaboratorCount = 1 + peerEntries.length;
  const isHost = session.role === "host";
  const isTransient = session.status === "connecting" || session.status === "reconnecting";
  const headline = isHost ? "Sharing canvas" : "In session";
  const subhead =
    session.status === "connecting"
      ? "Connecting to host…"
      : session.status === "reconnecting"
        ? isHost
          ? "Lost contact with peers. Trying to reconnect…"
          : "Lost contact with host. Trying to reconnect…"
        : isHost
          ? "Anyone with the ticket can edit this canvas in real-time."
          : "Connected to host. Edits sync live.";
  const pillLabel =
    session.status === "connecting"
      ? "SYNC"
      : session.status === "reconnecting"
        ? "RECONNECTING"
        : "LIVE";

  return (
    <div className="collab-panel">
      <header className="collab-header">
        <div className="collab-header-icon collab-header-icon--live">
          <IconBroadcast size={18} stroke={1.75} />
        </div>
        <div className="collab-header-text">
          <h2>{headline}</h2>
          <p>{subhead}</p>
        </div>
        <div className={`collab-live-pill ${isTransient ? "is-connecting" : ""}`}>
          <span className="collab-live-dot" />
          {pillLabel}
        </div>
      </header>

      <section className="collab-section">
        <div className="collab-label">Invite ticket</div>
        <div className="collab-ticket-row">
          <code className="collab-ticket">{session.ticket}</code>
          <CopyButton value={session.ticket} timeout={1500}>
            {({ copied, copy }) => (
              <button type="button" className="collab-copy-button" onClick={copy}>
                {copied ? <IconCheck size={13} stroke={2} /> : <IconCopy size={13} stroke={1.75} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </CopyButton>
        </div>
      </section>

      <div className="collab-divider" />

      <section className="collab-section">
        <div className="collab-label">
          Collaborators · <span className="collab-count">{collaboratorCount}</span>
        </div>

        <ul className="collab-list">
          <li className="collab-row">
            <span className="collab-avatar" style={{ backgroundColor: session.myColor }}>
              {initialFromName(session.myName)}
              <span className="collab-presence" />
            </span>
            <span className="collab-name">
              {session.myName} <span className="collab-you">(you)</span>
            </span>
            <span className="collab-role">{isHost ? "HOST" : "EDITOR"}</span>
          </li>
          {peerEntries.map((p) => (
            <li className="collab-row" key={p.author}>
              <span className="collab-avatar" style={{ backgroundColor: p.color }}>
                {initialFromName(p.name)}
                <span className="collab-presence" />
              </span>
              <span className="collab-name">{p.name}</span>
              <span className="collab-role">{p.isHost ? "HOST" : "EDITOR"}</span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="collab-end-button" onClick={endSession} disabled={busy}>
        <IconX size={14} stroke={2} />
        <span>End session</span>
      </button>
    </div>
  );
}
