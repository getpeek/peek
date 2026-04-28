export type Role = "host" | "joiner";

export type SessionStatus = "connecting" | "active" | "reconnecting" | "ending";

export interface SessionState {
  role: Role;
  status: SessionStatus;
  ticket: string;
  myAuthor: string;
  myColor: string;
  myName: string;
  namespaceId: string;
}

export interface Peer {
  author: string;
  name: string;
  color: string;
  isHost: boolean;
  lastSeen: number;
}

export interface RemoteCursor {
  flowX: number;
  flowY: number;
  // Page the sender was on when the cursor was emitted. The renderer hides
  // cursors whose pageId doesn't match the local active page so peers on
  // different pages don't see ghosts of each other's pointers.
  pageId: string;
  updatedAt: number;
}

export type Operation =
  | { kind: "put"; key: string; value: Uint8Array }
  | { kind: "del"; key: string };
