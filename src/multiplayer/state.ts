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
import type { DatabaseResult, Schema } from "../state";

export interface PreSessionSnapshot {
  document: CanvasDocument;
  results: Record<string, DatabaseResult>;
  // The joiner's pre-session schema (their own DB's). The host's schema
  // overwrites `schemaAtom` during the session so the LSP and canvas show
  // host-side tables; we restore this on end so the joiner is back on
  // their own DB context.
  schema: Schema;
}

export const preSessionSnapshotAtom = atom<PreSessionSnapshot | null>(null);

// Counts mp_doc_put / mp_doc_del failures during a session. Bumped from
// `pushOperation` and read by `ShareLiveHeader` to surface that the local
// canvas may be out of sync with the host's replica. Reset on session end —
// stale counts from a previous session shouldn't bleed into a new one.
export interface MultiplayerSyncIssue {
  count: number;
  lastError: { kind: "put" | "del"; key: string; message: string; at: number } | null;
}
export const multiplayerSyncIssueAtom = atom<MultiplayerSyncIssue>({
  count: 0,
  lastError: null,
});
