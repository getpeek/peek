import { invoke } from "@tauri-apps/api/core";
import { getDefaultStore } from "jotai";
import { canvasApiAtom, documentAtom } from "../canvas/state";
import { createPromptRunner, type Message } from "../canvas/hooks/useExecutePrompt";
import { createAgentToolHandlers } from "../canvas/nodes/Agent/useAgentTools";
import { runAgentConversation } from "../canvas/nodes/Agent/runAgentConversation";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOLS } from "../canvas/nodes/Agent/agentTools";
import { pageContainingNode } from "../mcp/createNodes";
import { configAtom } from "../state";
import { AGENT_CANCELS_PREFIX, AGENT_REQUESTS_PREFIX, agentCancelKey } from "./keys";
import { pushOperation } from "./syncBridgeUtils";
import type { AgentData } from "../canvas/types";

interface AgentRequestPayload {
  nodeId: string;
  question: string;
}

interface ActiveRun {
  requestId: string;
  abort: () => void;
}

// One run per agent node. Guards against a guest firing a second request while
// the host is still streaming, and lets `handleAgentCancel` find a run by id.
const activeRuns = new Map<string, ActiveRun>();

// ~10 Hz — throttles token gossip; the authoritative text lands in node data
// via the normal doc sync, so dropped partials only cost a smoother preview.
const AGENT_STREAM_GOSSIP_MS = 100;

function currentMessages(nodeId: string): Message[] {
  const doc = getDefaultStore().get(documentAtom);
  const pageId = pageContainingNode(doc, nodeId);
  if (!pageId) {
    return [];
  }
  const node = doc.pages[pageId].nodes.find(n => n.id === nodeId);
  if (!node || node.type !== "agent") {
    return [];
  }
  return (node.data as AgentData).messages;
}

// Append to the node's messages by writing `documentAtom` page-addressed — the
// wrapped atom notifies the outbound listener, so the appended message syncs to
// every peer as a normal node put.
function appendMessage(nodeId: string, message: Message): void {
  getDefaultStore().set(documentAtom, doc => {
    const pageId = pageContainingNode(doc, nodeId);
    if (!pageId) {
      return doc;
    }
    const page = doc.pages[pageId];
    return {
      ...doc,
      pages: {
        ...doc.pages,
        [pageId]: {
          ...page,
          nodes: page.nodes.map(n =>
            n.id === nodeId && n.type === "agent"
              ? { ...n, data: { ...n.data, messages: [...n.data.messages, message] } }
              : n,
          ),
        },
      },
    };
  });
}

/**
 * Host-side: run an agent conversation a guest requested via
 * `agent-requests/<id>`. Appended messages sync back through the normal doc
 * put path; partial tokens stream over gossip. The request key is deleted when
 * the run settles.
 */
export async function handleAgentRequest(key: string, value: Uint8Array): Promise<void> {
  const store = getDefaultStore();
  const requestId = key.slice(AGENT_REQUESTS_PREFIX.length);

  let payload: AgentRequestPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(value)) as AgentRequestPayload;
  } catch (e) {
    console.error("multiplayer: bad agent-request payload:", e);
    pushOperation({ kind: "del", key });
    return;
  }

  const canvas = store.get(canvasApiAtom);
  const config = store.get(configAtom);
  if (!canvas || !config) {
    pushOperation({ kind: "del", key });
    return;
  }

  const doc = store.get(documentAtom);
  const pageId = pageContainingNode(doc, payload.nodeId);
  const node = pageId ? doc.pages[pageId].nodes.find(n => n.id === payload.nodeId) : undefined;
  if (!node || node.type !== "agent") {
    console.warn("multiplayer: agent-request for unknown agent node", payload.nodeId);
    pushOperation({ kind: "del", key });
    return;
  }

  if (activeRuns.has(payload.nodeId)) {
    appendMessage(payload.nodeId, {
      type: "system",
      message: "Agent is already running.",
      timestamp: Date.now(),
    });
    pushOperation({ kind: "del", key });
    return;
  }

  let aborted = false;
  activeRuns.set(payload.nodeId, {
    requestId,
    abort: () => {
      aborted = true;
    },
  });

  let lastGossip = 0;
  const onPartial = (text: string) => {
    const now = Date.now();
    if (text !== "" && now - lastGossip < AGENT_STREAM_GOSSIP_MS) {
      return;
    }
    lastGossip = now;
    invoke("mp_gossip_send", {
      payload: { type: "agent-stream", nodeId: payload.nodeId, requestId, text },
    }).catch(() => {});
  };

  try {
    const runPrompt = createPromptRunner({
      tools: AGENT_TOOLS,
      systemPrompt: AGENT_SYSTEM_PROMPT,
      config,
    });
    const handlers = createAgentToolHandlers({ canvas, nodeId: payload.nodeId });
    await runAgentConversation({
      question: payload.question,
      getMessages: () => currentMessages(payload.nodeId),
      appendMessage: message => appendMessage(payload.nodeId, message),
      runPrompt,
      handlers,
      onPartial,
      shouldAbort: () => aborted,
    });
  } catch (e) {
    appendMessage(payload.nodeId, {
      type: "system",
      message: `Agent run failed: ${e instanceof Error ? e.message : String(e)}`,
      timestamp: Date.now(),
    });
  } finally {
    invoke("mp_gossip_send", {
      payload: { type: "agent-stream-end", nodeId: payload.nodeId, requestId },
    }).catch(() => {});
    pushOperation({ kind: "del", key });
    pushOperation({ kind: "del", key: agentCancelKey(requestId) });
    activeRuns.delete(payload.nodeId);
  }
}

/** Host-side: abort the run a guest cancelled via `agent-cancels/<id>`. */
export function handleAgentCancel(key: string): void {
  const requestId = key.slice(AGENT_CANCELS_PREFIX.length);
  for (const run of activeRuns.values()) {
    if (run.requestId === requestId) {
      run.abort();
      return;
    }
  }
  // The run already settled — clear the orphaned cancel signal so it doesn't
  // linger in the doc.
  pushOperation({ kind: "del", key });
}
