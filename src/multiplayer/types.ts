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
  currentPageId: string;
  lastSeen: number;
}

export interface RemoteCursor {
  flowX: number;
  flowY: number;
  pageId: string;
  updatedAt: number;
}

// A peer's camera: the flow-space point at the center of their canvas pane plus
// their zoom. Pane-size independent, so a follower re-centers faithfully even
// on a differently-sized window. Broadcast ephemerally over gossip — never
// persisted to the doc.
export interface RemoteViewport {
  centerX: number;
  centerY: number;
  zoom: number;
  pageId: string;
  updatedAt: number;
}

export type Operation =
  | { kind: "put"; key: string; value: Uint8Array }
  | { kind: "del"; key: string };
