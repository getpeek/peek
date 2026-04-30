import { useState } from "react";
import type { MultiplayerControls } from "../../../multiplayer/syncBridge";

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

export function useCollaborateActions({ onClose }: { onClose?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [ticket, setTicketState] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const setTicket = (value: string) => {
    setTicketState(value);
    setJoinError(null);
  };

  const startSession = async () => {
    setBusy(true);
    try {
      await controls()?.host();
    } catch (e) {
      console.error("host session failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const joinSession = async () => {
    const trimmed = ticket.trim();
    if (!trimmed) {
      setJoinError("Paste a ticket to join.");
      return;
    }
    setBusy(true);
    setJoinError(null);
    try {
      await controls()?.join(trimmed);
      setTicketState("");
      onClose?.();
    } catch (e) {
      setJoinError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const endSession = async () => {
    setBusy(true);
    try {
      await controls()?.end();
      onClose?.();
    } catch (e) {
      console.error("end session failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return { busy, ticket, joinError, setTicket, startSession, joinSession, endSession };
}
