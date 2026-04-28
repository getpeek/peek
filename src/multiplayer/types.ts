export type Role = "host" | "joiner";

export type SessionStatus = "connecting" | "active" | "ending";

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
  updatedAt: number;
}

export type Operation =
  | { kind: "put"; key: string; value: Uint8Array }
  | { kind: "del"; key: string };
