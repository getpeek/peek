import { NodeProps, NodeResizer } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useExecutePrompt } from "../../../shapes/Ai/useExecutePrompt";
import { configAtom } from "../../../state";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { ChatInput } from "./ChatInput";
import { ChatEmptyState } from "./EmptyState";
import { MessageItem } from "./MessageItem";
import { MessageList } from "./MessageList";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOLS } from "./agentTools";
import { useAgentContextSync } from "./useAgentContextSync";
import { useAgentStream } from "./useAgentStream";
import { useAgentTools } from "./useAgentTools";
import type { AgentNode as AgentNodeT } from "../../types";
import "./agent.css";

const DEFAULT_W = 540;
const DEFAULT_H = 400;

export function AgentNode({ id, data, selected, width, height }: NodeProps<AgentNodeT>) {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  const config = useAtomValue(configAtom);
  const modelName = config?.ai.model ?? "model";

  const runPrompt = useExecutePrompt({ tools: AGENT_TOOLS, systemPrompt: AGENT_SYSTEM_PROMPT });
  const handlers = useAgentTools({ nodeId: id });
  const { ask, stop, isLoading, incomingMessage } = useAgentStream({
    nodeId: id,
    runPrompt,
    handlers,
  });

  useAgentContextSync({ nodeId: id });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages.length, incomingMessage, isLoading]);

  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  const submit = () => {
    const q = question;
    setQuestion("");
    ask(q);
  };

  // Schema context is injected silently for the model, so it doesn't count as a
  // user-facing message — a from-scratch agent should still show the empty state.
  const hasVisibleMessages = data.messages.some(
    m => !(m.type === "context" && m.contextKind === "schema"),
  );

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={400} minHeight={300} />
      <HiddenHandles connectableTarget />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader nodeId={id} name={modelName} indicator={<NodeIndicator kind='agent' />} />
        <div className='app-node-body nodrag' ref={bodyRef}>
          <div className='chat-container'>
            <div className='messages-container'>
              {hasVisibleMessages ? <MessageList messages={data.messages} /> : <ChatEmptyState />}
              {incomingMessage && (
                <MessageItem
                  message={{
                    type: "assistant",
                    message: incomingMessage,
                    timestamp: Date.now(),
                  }}
                  index={data.messages.length}
                />
              )}
              {isLoading && !incomingMessage && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput
              value={question}
              onChange={setQuestion}
              onSubmit={submit}
              onStop={stop}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
