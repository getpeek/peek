import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { useAtomValue } from "jotai";
import { configAtom } from "../../state";

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface Message {
  type: "user" | "assistant" | "system" | "context" | "tool_call" | "tool_result";
  message: string;
  timestamp: number;
  contextKey?: string;
  contextKind?: "schema" | "result";
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
}

export const useExecutePrompt = (opts: {
  tools: DynamicStructuredTool[];
  systemPrompt: string;
}) => {
  const { tools, systemPrompt } = opts;
  const config = useAtomValue(configAtom)!;

  const baseModel = new ChatOllama({
    model: config.ai.model,
    baseUrl: config.ai.url,
    streaming: true,
    numThread: 32,
    keepAlive: "10m",
    think: false,
  });

  return (messages: Message[] = []) => {
    const model = tools.length > 0 ? baseModel.bindTools(tools) : baseModel;

    const conversation: BaseMessage[] = [];
    if (systemPrompt) {
      conversation.push(new SystemMessage(systemPrompt));
    }

    for (const message of messages) {
      if (message.type === "context") {
        conversation.push(new HumanMessage(`Here is a fresh query and data:\n${message.message}`));
        conversation.push(new AIMessage(`Ok! I've received the new query and data`));
      } else if (message.type === "user") {
        conversation.push(new HumanMessage(message.message));
      } else if (message.type === "assistant") {
        conversation.push(new AIMessage(message.message));
      } else if (message.type === "system") {
        conversation.push(new SystemMessage(message.message));
      } else if (message.type === "tool_call") {
        conversation.push(
          new AIMessage({
            content: message.message,
            tool_calls: (message.toolCalls ?? []).map(c => ({
              id: c.id,
              name: c.name,
              args: (c.args ?? {}) as Record<string, unknown>,
            })),
          }),
        );
      } else if (message.type === "tool_result") {
        conversation.push(
          new ToolMessage({
            content: message.message,
            tool_call_id: message.toolCallId ?? "",
          }),
        );
      }
    }

    return model.stream(conversation);
  };
};
