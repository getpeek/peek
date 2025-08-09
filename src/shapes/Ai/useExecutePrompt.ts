import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { invoke } from "@tauri-apps/api/core";

export interface Message {
  type: "user" | "assistant" | "system" | "context";
  message: string;
  timestamp: number;
  contextKey?: string;
}

const advancedModel = new ChatOllama({
  model: "gpt-oss:20b",
  baseUrl: "http://localhost:11434",
  streaming: true,
  numThread: 32,
});

const fastModel = new ChatOllama({
  model: "gpt-oss:20b",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

export const branchToNewConversationTool = new DynamicStructuredTool({
  name: "branchToNewConversation",
  description:
    "Call this only when the user explicitly asks you to write a new PostgreSQL query which branches out to a new conversation. Do not use this for explaining or analyzing data.",
  schema: z.object({
    query: z
      .string()
      .describe("A valid postgres sql query to create a query node for"),
  }),
  func: async ({ query }: { query: string }): Promise<string> => {
    return query;
  },
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

export const useExecutePrompt = (modelType: "fast" | "advanced") => {
  return async (messages: Message[] = []) => {
    const model =
      modelType === "advanced"
        ? advancedModel.bindTools([
            branchToNewConversationTool,
            getAdditionalContextTool,
          ])
        : fastModel;

    const conversation: BaseMessage[] = [];

    for (const message of messages) {
      if (message.type === "context") {
        conversation.push(
          new HumanMessage(
            `Here is a fresh query and data:\n${message.message}`,
          ),
        );
        conversation.push(
          new AIMessage(`Ok! I've received the new query and data`),
        );
      } else if (message.type === "user") {
        conversation.push(new HumanMessage(message.message));
      } else if (message.type === "assistant") {
        conversation.push(new AIMessage(message.message));
      } else if (message.type === "system") {
        conversation.push(new SystemMessage(message.message));
      }
    }

    return model.stream(conversation);
  };
};
