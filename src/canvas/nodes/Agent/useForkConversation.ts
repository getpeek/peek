import { useCanvas } from "../../hooks/useCanvas";
import { ids } from "../../ids";
import type { AgentData, AgentNode } from "../../types";

const DEFAULT_W = 540;
const DEFAULT_H = 400;

/** Spawns a sibling agent node carrying the source node's full history, so the
 *  user can branch a conversation and take it down a different path. Messages are
 *  copied into a fresh node rather than shared — the two conversations diverge. */
export function useForkConversation(nodeId: string) {
  const canvas = useCanvas();

  return () => {
    const node = canvas.getNode(nodeId);
    if (!node || node.type !== "agent") {
      return;
    }

    const forkId = ids.agent();
    const fork: AgentNode = {
      id: forkId,
      type: "agent",
      position: {
        x: node.position.x + (node.width ?? DEFAULT_W) + 50,
        y: node.position.y,
      },
      width: node.width ?? DEFAULT_W,
      height: node.height ?? DEFAULT_H,
      data: {
        query: node.data.query,
        provider: node.data.provider,
        messages: [...node.data.messages],
      } satisfies AgentData,
    };

    canvas.addNode(fork);
    canvas.connect(nodeId, forkId);
    canvas.selectOnly(forkId);
    canvas.zoomToNode(forkId, { duration: 200 });
  };
}
