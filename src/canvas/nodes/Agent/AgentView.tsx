import { NodeResizer } from "@xyflow/react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconGitFork } from "@tabler/icons-react";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import type { AgentData } from "../../types";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { ChatInput } from "./ChatInput";
import { useForkConversation } from "./useForkConversation";
import { ChatEmptyState } from "./EmptyState";
import { MessageItem } from "./MessageItem";
import { MessageList } from "./MessageList";
import { ThinkingIndicator } from "./ThinkingIndicator";

const DEFAULT_W = 540;
const DEFAULT_H = 400;

export interface AgentViewProps {
  id: string;
  data: AgentData;
  selected: boolean;
  width?: number;
  height?: number;
  title: string;
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  incomingMessage: string;
  incomingThought?: string;
  /** Slots + Shift+Tab handler for the ACP path; omitted on the Ollama path. */
  headerExtra?: ReactNode;
  banner?: ReactNode;
  overlay?: ReactNode;
  onCycleMode?: () => void;
}

export function AgentView(props: AgentViewProps) {
  const { id, data, selected, width, height, title } = props;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages.length, props.incomingMessage, props.incomingThought, props.isLoading]);

  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const hasVisibleMessages = data.messages.length > 0;
  const fork = useForkConversation(id);
  const showThinking = props.isLoading && !props.incomingMessage && !props.incomingThought;

  return (
    <>
      <NodeResizer minWidth={400} minHeight={300} />
      <HiddenHandles connectableTarget />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader nodeId={id} name={title} indicator={<NodeIndicator kind='agent' />}>
          {props.headerExtra}
          {hasVisibleMessages && (
            <Tooltip label='Fork conversation'>
              <button className='header-icon-btn' onClick={fork}>
                <IconGitFork size={12} />
              </button>
            </Tooltip>
          )}
        </NodeHeader>
        <div className='app-node-body nodrag' ref={bodyRef}>
          <div className='chat-container'>
            {props.banner}
            <div className='messages-container' ref={messagesScrollRef}>
              {hasVisibleMessages ? (
                <MessageList messages={data.messages} scrollRef={messagesScrollRef} />
              ) : (
                <ChatEmptyState />
              )}
              {props.incomingThought && (
                <MessageItem
                  message={{ type: "thought", message: props.incomingThought, timestamp: 0 }}
                  index={data.messages.length}
                />
              )}
              {props.incomingMessage && (
                <MessageItem
                  message={{ type: "assistant", message: props.incomingMessage, timestamp: 0 }}
                  index={data.messages.length}
                />
              )}
              {showThinking && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
            {props.overlay}
            <ChatInput
              value={props.question}
              onChange={props.setQuestion}
              onSubmit={props.onSubmit}
              onStop={props.onStop}
              isLoading={props.isLoading}
              onCycleMode={props.onCycleMode}
            />
          </div>
        </div>
      </div>
    </>
  );
}
