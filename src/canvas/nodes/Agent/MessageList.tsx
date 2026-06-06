import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../../../shapes/Ai/useExecutePrompt";
import { MessageItem } from "./MessageItem";
import { ToolBlock } from "./ToolBlock";

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const consumed = new Set<string>();
  let resultContextSeen = 0;

  return messages.map((message, i) => {
    const key = `${message.timestamp}-${message.type}-${i}`;

    if (message.type === "context") {
      // Schema context feeds the model but isn't a user-facing event; only
      // attached query+result data shows the "Context inserted/updated" row.
      if (message.contextKind === "schema") {
        return null;
      }
      const updated = resultContextSeen > 0;
      resultContextSeen++;
      return <MessageItem key={key} message={message} index={i} contextUpdated={updated} />;
    }

    if (message.type === "tool_result") {
      // Rendered inside its paired tool_call block.
      return message.toolCallId && consumed.has(message.toolCallId) ? null : (
        <MessageItem key={key} message={message} index={i} />
      );
    }

    if (message.type === "tool_call") {
      const calls = message.toolCalls ?? [];
      const blocks = calls.map(call => {
        const result = messages.find(m => m.type === "tool_result" && m.toolCallId === call.id);
        if (call.id) {
          consumed.add(call.id);
        }
        return (
          <ToolBlock
            key={call.id}
            call={call}
            resultText={result?.message ?? ""}
            isError={result?.isError ?? false}
          />
        );
      });

      return (
        <div className='msg msg-assistant' key={key}>
          {message.message.trim() && (
            <div className='message-content'>
              <Markdown remarkPlugins={[remarkGfm]}>{message.message}</Markdown>
            </div>
          )}
          <div className='assistant-items'>{blocks}</div>
        </div>
      );
    }

    return <MessageItem key={key} message={message} index={i} />;
  });
};
