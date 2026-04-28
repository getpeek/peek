import { atom } from "jotai";
import type { Peer, RemoteCursor, SessionState } from "./types";

export const sessionStateAtom = atom<SessionState | null>(null);

export const participantsAtom = atom<Record<string, Peer>>({});

export const remoteCursorsAtom = atom<Record<string, RemoteCursor>>({});

// Whether the collaborate popover in the titlebar is open. Toggled by the
// titlebar button itself and by the command palette host/join entries.
export const collaboratePopoverOpenAtom = atom<boolean>(false);

// Snapshot of the canvas document captured before a joiner's local document
// is replaced by the host's replica. Restored on session end so the joiner
// returns to their pre-session state without losing unsaved work.
import type { CanvasDocument } from "../canvas/types";
import type { DatabaseResult } from "../state";

export interface PreSessionSnapshot {
  document: CanvasDocument;
  results: Record<string, DatabaseResult>;
}

export const preSessionSnapshotAtom = atom<PreSessionSnapshot | null>(null);
