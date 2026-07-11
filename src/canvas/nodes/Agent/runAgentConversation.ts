import { type Message, type PromptRunner, type ToolCall } from "../../hooks/useExecutePrompt";
import type { ToolHandlers } from "./useAgentTools";

const MAX_TOOL_ITERATIONS = 8;

const POST_TOOL_INSTRUCTION =
  "Continue using tools as needed to finish the user's request, then summarize what you did. If the tool results already answer the request, respond to the user instead of calling more tools.";

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

/**
 * Drive one agent turn: append the user message, stream the model, execute any
 * tool calls, and loop until the model answers, repeats itself, or hits the
 * iteration cap. Kept free of React and canvas specifics so both the local
 * agent node (`useAgentStream`) and the multiplayer host proxy can run it.
 *
 * `getMessages` returns the prior conversation and must be read before the user
 * message is appended, so the seeded working set is `[...prior, userMessage]`.
 * `onPartial` receives the full accumulated assistant text (or `""` at message
 * boundaries); `shouldAbort` is polled between chunks and iterations.
 */
export async function runAgentConversation(opts: {
  question: string;
  getMessages: () => Message[];
  appendMessage: (message: Message) => void;
  runPrompt: PromptRunner;
  handlers: ToolHandlers;
  onPartial: (text: string) => void;
  shouldAbort: () => boolean;
}): Promise<void> {
  const { question, getMessages, appendMessage, runPrompt, handlers, onPartial, shouldAbort } =
    opts;

  const priorMessages = getMessages();
  const userMessage: Message = {
    type: "user",
    message: question,
    timestamp: Date.now(),
  };
  appendMessage(userMessage);

  let working: Message[] = [...priorMessages, userMessage];
  let iterations = 0;
  const seenCallSignatures = new Set<string>();

  try {
    while (true) {
      if (shouldAbort()) {
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
        if (shouldAbort()) {
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
        onPartial(text);
      }

      if (shouldAbort()) {
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

      onPartial("");
    }
  } catch (e) {
    console.error("Agent stream error:", e);
  } finally {
    onPartial("");
  }
}
