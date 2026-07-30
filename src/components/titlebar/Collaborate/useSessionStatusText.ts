import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { multiplayerSyncIssueAtom } from "../../../multiplayer/state";
import type { SessionState } from "../../../multiplayer/types";

// How long a joiner can sit in `connecting` before we tell them sync isn't
// completing. The relay-based gossip path can succeed (so the host's avatar
// shows up) while the iroh-docs sync connection silently fails behind a NAT;
// without this surface the joiner has no clue why their canvas stays empty.
const STUCK_TIMEOUT_MS = 15000;

export type StatusTone = "off" | "starting" | "on" | "warn";

export interface SessionStatusText {
  tone: StatusTone;
  /** Strip's first line — the session's state in two or three words. */
  title: string;
  /** Strip's second line — what that state means right now. */
  meta: string;
  /** The header's sentence, including every diagnostic the old LIVE pill carried. */
  subhead: string;
}

interface Options {
  session: SessionState | null;
  peerCount: number;
  targetLabel?: string;
}

export function useSessionStatusText({
  session,
  peerCount,
  targetLabel = "peek://",
}: Options): SessionStatusText {
  const syncIssue = useAtomValue(multiplayerSyncIssueAtom);
  const [stuckOnConnecting, setStuckOnConnecting] = useState(false);
  const status = session?.status;
  const role = session?.role;

  useEffect(() => {
    if (status !== "connecting" || role !== "joiner") {
      setStuckOnConnecting(false);
      return;
    }
    const timer = window.setTimeout(() => setStuckOnConnecting(true), STUCK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status, role]);

  if (!session) {
    return {
      tone: "off",
      title: "Sharing off",
      meta: "Visible only to you",
      subhead: "Sharing is a switch on this canvas. Flip it when you want company.",
    };
  }

  const isHost = session.role === "host";

  if (session.status === "ending") {
    return {
      tone: "starting",
      title: "Ending…",
      meta: "Closing the session",
      subhead: "Winding the session down…",
    };
  }

  if (session.status === "connecting") {
    if (stuckOnConnecting) {
      return {
        tone: "warn",
        title: "Sync isn't completing",
        meta: "Try leaving and rejoining",
        subhead: "Sync isn't completing — try ending the session and rejoining.",
      };
    }
    return isHost
      ? {
          tone: "starting",
          title: "Starting…",
          meta: "Minting a ticket",
          subhead: "Minting a ticket and opening the relay.",
        }
      : {
          tone: "starting",
          title: "Connecting…",
          meta: "Reaching the host",
          subhead: "Connecting to host…",
        };
  }

  if (session.status === "reconnecting") {
    return {
      tone: "warn",
      title: "Reconnecting…",
      meta: isHost ? "Lost contact with peers" : "Lost contact with host",
      subhead: isHost
        ? "Lost contact with peers. Trying to reconnect…"
        : "Lost contact with host. Trying to reconnect…",
    };
  }

  if (syncIssue.count > 0) {
    return {
      tone: "warn",
      title: isHost ? "Sharing on" : "Connected",
      meta: "Some edits may not have propagated",
      subhead: "Sync issue: edits may not have propagated.",
    };
  }

  if (!isHost) {
    return {
      tone: "on",
      title: "Connected",
      meta: "Guest · editor access",
      subhead: "You're editing the host's canvas. Your changes are live for everyone.",
    };
  }

  return {
    tone: "on",
    title: "Sharing on",
    meta: peerCount
      ? `${peerCount + 1} people · ${targetLabel} ready`
      : "Waiting for the first collaborator",
    subhead: "Anyone with the link can edit this canvas with you.",
  };
}
