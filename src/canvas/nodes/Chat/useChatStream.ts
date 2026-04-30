import { useRef, useState } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import type { ChatData } from "../../types";
import {
  type Message,
  type ToolCall,
  type useExecutePrompt,
} from "../../../shapes/Ai/useExecutePrompt";
import type { ToolHandlers } from "./useChatTools";

type RunPrompt = ReturnType<typeof useExecutePrompt>;

const MAX_TOOL_ITERATIONS = 5;

async function callTool(
  call: ToolCall,
  handlers: ToolHandlers,
): Promise<{ text: string; isError: boolean }> {
  const handler = handlers[call.name];
  if (!handler) {
    return { text: `No handler registered for tool "${call.name}"`, isError: true };
  }
  try {
    return { text: await handler(call.args), isError: false };
  } catch (e) {
    return {
      text: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
      isError: true,
    };
  }
}

const POST_TOOL_INSTRUCTION =
  "Now respond to the user using the tool result(s) above. Do not call any more tools unless absolutely necessary to answer.";

export function useChatStream(opts: {
  nodeId: string;
  runPrompt: RunPrompt;
  handlers: ToolHandlers;
}) {
  const { nodeId, runPrompt, handlers } = opts;
  const canvas = useCanvas();
  const [isLoading, setIsLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState("");
  const abortRef = useRef(false);

  const appendMessage = (msg: Message) => {
    canvas.updateNodeData<ChatData>(nodeId, d => ({
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
    if (!node || node.type !== "chat") {
      return;
    }

    const userMessage: Message = {
      type: "user",
      message: question,
      timestamp: Date.now(),
    };

    abortRef.current = false;
    setIsLoading(true);
    appendMessage(userMessage);

    let working: Message[] = [...(node.data as ChatData).messages, userMessage];
    let iterations = 0;
    const seenCallSignatures = new Set<string>();

    try {
      while (true) {
        if (abortRef.current) {
          break;
        }

        iterations++;
        if (iterations > MAX_TOOL_ITERATIONS) {
          appendMessage({
            type: "system",
            message: `Tool iteration limit (${MAX_TOOL_ITERATIONS}) reached.`,
            timestamp: Date.now(),
          });
          break;
        }

        const stream = await runPrompt(working);
        let text = "";
        const calls: ToolCall[] = [];

        for await (const chunk of stream) {
          if (abortRef.current) {
            break;
          }
          if (chunk.text === "<think>" || chunk.text === "</think>") {
            continue;
          }
          if (chunk.tool_calls?.length) {
            calls.push(
              ...chunk.tool_calls.map(c => ({
                id: c.id ?? crypto.randomUUID(),
                name: c.name,
                args: c.args,
              })),
            );
          }
          text += chunk.text ?? "";
          setIncomingMessage(text);
        }

        if (abortRef.current) {
          if (text.trim()) {
            appendMessage({
              type: "assistant",
              message: text,
              timestamp: Date.now(),
            });
          }
          break;
        }

        if (calls.length === 0) {
          if (text.trim()) {
            appendMessage({
              type: "assistant",
              message: text,
              timestamp: Date.now(),
            });
          }
          break;
        }

        const signature = calls
          .map(c => `${c.name}(${JSON.stringify(c.args)})`)
          .toSorted()
          .join("|");
        if (seenCallSignatures.has(signature)) {
          if (text.trim()) {
            appendMessage({
              type: "assistant",
              message: text,
              timestamp: Date.now(),
            });
          }
          appendMessage({
            type: "system",
            message: "Stopped: the model repeated the same tool call.",
            timestamp: Date.now(),
          });
          break;
        }
        seenCallSignatures.add(signature);

        const callMessage: Message = {
          type: "tool_call",
          message: text,
          toolCalls: calls,
          timestamp: Date.now(),
        };
        working = [...working, callMessage];
        appendMessage(callMessage);

        const resultMessages: Message[] = [];
        for (const call of calls) {
          const { text: resultText, isError } = await callTool(call, handlers);
          const resultMessage: Message = {
            type: "tool_result",
            message: resultText,
            toolCallId: call.id,
            toolName: call.name,
            isError,
            timestamp: Date.now(),
          };
          resultMessages.push(resultMessage);
          appendMessage(resultMessage);
        }
        const instruction: Message = {
          type: "user",
          message: POST_TOOL_INSTRUCTION,
          timestamp: Date.now(),
        };
        working = [...working, ...resultMessages, instruction];

        setIncomingMessage("");
      }
    } catch (e) {
      console.error("Chat stream error:", e);
    } finally {
      setIncomingMessage("");
      setIsLoading(false);
    }
  };

  return { ask, stop, isLoading, incomingMessage };
}
