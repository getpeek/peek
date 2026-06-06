import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { memo, useMemo, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Message, ToolCall } from "../../../shapes/Ai/useExecutePrompt";
import { MessageItem } from "./MessageItem";
import { ToolBlock } from "./ToolBlock";

interface MessageListProps {
  messages: Message[];
  scrollRef: RefObject<HTMLDivElement | null>;
}

interface ToolBlockData {
  id: string;
  call: ToolCall;
  resultText: string;
  isError: boolean;
}

type RenderItem =
  | { kind: "message"; key: string; message: Message; index: number; contextUpdated: boolean }
  | { kind: "tool_call"; key: string; message: Message; index: number; blocks: ToolBlockData[] };

// Resolve the order-dependent bookkeeping (tool_call/tool_result pairing,
// schema-context filtering, "updated" vs "inserted" context labels) in a single
// pass over the full conversation, producing a flat list the virtualizer can
// index into. Must run in array order — a tool_call marks its result ids
// consumed so the later tool_result row is suppressed.
function buildRenderItems(messages: Message[]): RenderItem[] {
  const consumed = new Set<string>();
  let resultContextSeen = 0;
  const items: RenderItem[] = [];

  messages.forEach((message, i) => {
    const key = `${message.timestamp}-${message.type}-${i}`;

    if (message.type === "context") {
      // Schema context feeds the model but isn't a user-facing event.
      if (message.contextKind === "schema") {
        return;
      }
      const contextUpdated = resultContextSeen > 0;
      resultContextSeen++;
      items.push({ kind: "message", key, message, index: i, contextUpdated });
      return;
    }

    if (message.type === "tool_result") {
      // Rendered inside its paired tool_call block.
      if (message.toolCallId && consumed.has(message.toolCallId)) {
        return;
      }
      items.push({ kind: "message", key, message, index: i, contextUpdated: false });
      return;
    }

    if (message.type === "tool_call") {
      const blocks = (message.toolCalls ?? []).map(call => {
        const result = messages.find(m => m.type === "tool_result" && m.toolCallId === call.id);
        if (call.id) {
          consumed.add(call.id);
        }
        return {
          id: call.id,
          call,
          resultText: result?.message ?? "",
          isError: result?.isError ?? false,
        };
      });
      items.push({ kind: "tool_call", key, message, index: i, blocks });
      return;
    }

    items.push({ kind: "message", key, message, index: i, contextUpdated: false });
  });

  return items;
}

// Memoized so a list re-render (scroll, or a parent re-render) doesn't re-run
// react-markdown for rows whose resolved item is unchanged. `item` references
// stay stable while `messages` is unchanged (the pre-pass is memoized), so the
// expensive markdown subtrees are only rebuilt when the conversation changes.
const RenderedItem = memo(function RenderedItem({ item }: { item: RenderItem }) {
  if (item.kind === "tool_call") {
    return (
      <div className='msg msg-assistant'>
        {item.message.message.trim() && (
          <div className='message-content'>
            <Markdown remarkPlugins={[remarkGfm]}>{item.message.message}</Markdown>
          </div>
        )}
        <div className='assistant-items'>
          {item.blocks.map(block => (
            <ToolBlock
              key={block.id}
              call={block.call}
              resultText={block.resultText}
              isError={block.isError}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <MessageItem message={item.message} index={item.index} contextUpdated={item.contextUpdated} />
  );
});

// Matches the `gap` between messages in `.messages-container`; applied as
// padding so it's included in each row's measured height (margins aren't).
const ITEM_GAP = 20;

export function MessageList({ messages, scrollRef }: MessageListProps) {
  const items = useMemo(() => buildRenderItems(messages), [messages]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 8,
  });

  return (
    <div
      className='messages-virtual'
      style={{
        height: virtualizer.getTotalSize(),
        flexShrink: 0,
        position: "relative",
        width: "100%",
      }}
    >
      {virtualizer.getVirtualItems().map(virtualItem => {
        const item = items[virtualItem.index];
        return (
          <div
            key={item.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
              paddingBottom: ITEM_GAP,
            }}
          >
            <RenderedItem item={item} />
          </div>
        );
      })}
    </div>
  );
}
