// The multiplayer doc key namespace: prefixes, key builders, and the classifier
// that routes an inbound key to its handler. Kept apart from `diff.ts` so the
// diffing algorithms and the key vocabulary they address can grow independently.

export const PAGE_ORDER_KEY = "doc/page-order";
export const RESULTS_PREFIX = "results/";
export const EXEC_REQUESTS_PREFIX = "exec-requests/";
export const AGENT_REQUESTS_PREFIX = "agent-requests/";
export const AGENT_CANCELS_PREFIX = "agent-cancels/";
export const SCHEMA_INDEX_KEY = "schema/index";

export function resultKey(nodeId: string): string {
  return `${RESULTS_PREFIX}${nodeId}`;
}

export function execRequestKey(requestId: string): string {
  return `${EXEC_REQUESTS_PREFIX}${requestId}`;
}

export function agentRequestKey(requestId: string): string {
  return `${AGENT_REQUESTS_PREFIX}${requestId}`;
}

export function agentCancelKey(requestId: string): string {
  return `${AGENT_CANCELS_PREFIX}${requestId}`;
}

export type KeyKind =
  | "doc"
  | "result"
  | "exec-request"
  | "agent-request"
  | "agent-cancel"
  | "schema"
  | "unknown";

export function keyKind(key: string): KeyKind {
  if (key === PAGE_ORDER_KEY) {
    return "doc";
  }
  if (key.startsWith("pages/")) {
    return "doc";
  }
  if (key.startsWith(RESULTS_PREFIX)) {
    return "result";
  }
  if (key.startsWith(EXEC_REQUESTS_PREFIX)) {
    return "exec-request";
  }
  if (key.startsWith(AGENT_REQUESTS_PREFIX)) {
    return "agent-request";
  }
  if (key.startsWith(AGENT_CANCELS_PREFIX)) {
    return "agent-cancel";
  }
  if (key === SCHEMA_INDEX_KEY) {
    return "schema";
  }
  return "unknown";
}
