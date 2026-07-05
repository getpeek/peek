import { atom } from "jotai";
import type { Peer, RemoteCursor, SessionState } from "./types";

export const sessionStateAtom = atom<SessionState | null>(null);

export const participantsAtom = atom<Record<string, Peer>>({});

export const remoteCursorsAtom = atom<Record<string, RemoteCursor>>({});

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
