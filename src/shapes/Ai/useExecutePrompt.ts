import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { invoke } from "@tauri-apps/api/core";
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
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
}

export const branchToNewConversationTool = new DynamicStructuredTool({
  name: "branchToNewConversation",
  description:
    "Call this only when the user explicitly asks you to write a new PostgreSQL query which branches out to a new conversation. Do not use this for explaining or analyzing data.",
  schema: z.object({
    query: z.string().describe("A valid postgres sql query to create a query node for"),
  }),
  func: ({ query }: { query: string }): Promise<string> => Promise.resolve(query),
});

export const getAdditionalContextTool = new DynamicStructuredTool({
  name: "getAdditionalContext",
  description:
    "call this tool when you need to fetch additional context from the database dig deeper and continue the analysis of data.",
  schema: z.object({
    query: z
      .string()
      .describe(
        "A valid postgres sql query to execute which returns a new database result to be analyzed",
      ),
  }),
  func: async ({ query }: { query: string }): Promise<any> => {
    try {
      const response = (await invoke("get_results", { query })) as string;
      const result = JSON.parse(response) as [string, unknown, string][][];

      return { success: true, data: result, query };
    } catch (e) {
      return {
        success: false,
        error: `The query returned this error: ${e}`,
        query,
      };
    }
  },
});

const ADVANCED_SYSTEM_PROMPT = `You analyze database query results to help the user understand their data.

When tools are available:
- getAdditionalContext: call when you need additional data from the database to answer the question.
- branchToNewConversation: call only when the user explicitly asks for a NEW SQL query.

After receiving a tool result, analyze the result and respond to the user directly with your insights. Do NOT call the same tool with the same arguments more than once. If the previous tool result already contains what you need, write the answer instead of calling another tool.`;

export const useExecutePrompt = (modelType: "fast" | "advanced") => {
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
    const model =
      modelType === "advanced"
        ? baseModel.bindTools([branchToNewConversationTool, getAdditionalContextTool])
        : baseModel;

    const conversation: BaseMessage[] = [];
    if (modelType === "advanced") {
      conversation.push(new SystemMessage(ADVANCED_SYSTEM_PROMPT));
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
            tool_calls: (message.toolCalls ?? []).map((c) => ({
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
