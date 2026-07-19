import { atom } from "jotai";
import type { Peer, RemoteCursor, RemoteViewport, SessionState } from "./types";

export const sessionStateAtom = atom<SessionState | null>(null);

export const participantsAtom = atom<Record<string, Peer>>({});

export const remoteCursorsAtom = atom<Record<string, RemoteCursor>>({});

// Peers' cameras (center + zoom), keyed by author. Drives follow-mode.
export const remoteViewportsAtom = atom<Record<string, RemoteViewport>>({});

// Author id of the peer whose camera the local view is currently following,
// or null when not following. Session-only, like `cameraLockedAtom`.
export const followingAuthorAtom = atom<string | null>(null);

export const collaboratePopoverOpenAtom = atom<boolean>(false);

import type { CanvasDocument } from "../canvas/types";
import type { DatabaseResult, Schema } from "../state";

export interface PreSessionSnapshot {
  document: CanvasDocument;
  results: Record<string, DatabaseResult>;
  schema: Schema;
}

export const preSessionSnapshotAtom = atom<PreSessionSnapshot | null>(null);

export interface MultiplayerSyncIssue {
  count: number;
  lastError: { kind: "put" | "del"; key: string; message: string; at: number } | null;
}
export const multiplayerSyncIssueAtom = atom<MultiplayerSyncIssue>({
  count: 0,
  lastError: null,
});
