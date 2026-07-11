import { useRef, useState } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import type { AgentData } from "../../types";
import { type Message, type PromptRunner } from "../../hooks/useExecutePrompt";
import type { ToolHandlers } from "./useAgentTools";
import { runAgentConversation } from "./runAgentConversation";

export function useAgentStream(opts: {
  nodeId: string;
  runPrompt: PromptRunner;
  handlers: ToolHandlers;
}) {
  const { nodeId, runPrompt, handlers } = opts;
  const canvas = useCanvas();
  const [isLoading, setIsLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState("");
  const abortRef = useRef(false);

  const appendMessage = (msg: Message) => {
    canvas.updateNodeData<AgentData>(nodeId, d => ({
      ...d,
      messages: [...d.messages, msg],
    }));
  };

  const stop = () => {
    abortRef.current = true;
  };

  const ask = async (question: string) => {
    if (!question.trim()) {
      return;
    }
    const node = canvas.getNode(nodeId);
    if (!node || node.type !== "agent") {
      return;
    }

    abortRef.current = false;
    setIsLoading(true);
    try {
      await runAgentConversation({
        question,
        getMessages: () => (node.data as AgentData).messages,
        appendMessage,
        runPrompt,
        handlers,
        onPartial: setIncomingMessage,
        shouldAbort: () => abortRef.current,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { ask, stop, isLoading, incomingMessage };
}
