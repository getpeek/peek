import { useState } from "react";
import type { MultiplayerControls } from "../../../multiplayer/syncBridge";
import { normalizeInviteTicket } from "./normalizeInviteTicket";

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
    const normalized = normalizeInviteTicket(ticket);
    if (!normalized) {
      setJoinError("That doesn't look like a Peek link or ticket.");
      return;
    }
    setBusy(true);
    setJoinError(null);
    try {
      await controls()?.join(normalized);
      setTicketState("");
      onClose?.();
    } catch (e) {
      setJoinError(String(e));
    } finally {
      setBusy(false);
    }
  };

  // Deliberately leaves the popover open: flipping the switch off (or leaving a
  // session) should show the panel settle back into its idle state, not vanish.
  const endSession = async () => {
    setBusy(true);
    try {
      await controls()?.end();
    } catch (e) {
      console.error("end session failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return { busy, ticket, joinError, setTicket, startSession, joinSession, endSession };
}
