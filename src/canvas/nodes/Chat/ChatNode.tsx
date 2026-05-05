import { NodeProps, NodeResizer } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { ChatEmptyState } from "../../../shapes/Chat/EmptyState";
import { MessageItem } from "../../../shapes/Chat/MessageItem";
import { MessageList } from "../../../shapes/Chat/MessageList";
import { useExecutePrompt } from "../../../shapes/Ai/useExecutePrompt";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { ChatInput } from "./ChatInput";
import { useChatContextSync } from "./useChatContextSync";
import { useChatStream } from "./useChatStream";
import { useChatTools } from "./useChatTools";
import type { ChatNode as ChatNodeT } from "../../types";
import "../../../shapes/Chat/Chat.css";

const DEFAULT_W = 540;
const DEFAULT_H = 400;

function firstLine(text: string): string {
  const line = text.split("\n").find(l => l.trim().length > 0);
  return line ? line.trim().slice(0, 40) : "";
}

export function ChatNode({ id, data, selected, width, height }: NodeProps<ChatNodeT>) {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  const runPrompt = useExecutePrompt("advanced");
  const handlers = useChatTools({ nodeId: id });
  const { ask, stop, isLoading, incomingMessage } = useChatStream({
    nodeId: id,
    runPrompt,
    handlers,
  });

  useChatContextSync({ nodeId: id, messages: data.messages });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages.length, incomingMessage]);

  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  const submit = () => {
    const q = question;
    setQuestion("");
    ask(q);
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={400} minHeight={300} />
      <HiddenHandles connectableTarget />
      <div
        className={`app-node ${selected ? "selected" : ""} ${isLoading ? "loading" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader
          nodeId={id}
          name={data.query ? `chat · ${firstLine(data.query)}` : "new conversation"}
          indicator={<NodeIndicator kind='chat' />}
        />
        <div className='app-node-body nodrag' ref={bodyRef}>
          <div className='chat-container'>
            <div className='messages-container'>
              {data.messages.length === 0 ? (
                <ChatEmptyState />
              ) : (
                <MessageList messages={data.messages} />
              )}
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
