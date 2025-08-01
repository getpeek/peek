import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

export interface Message {
  type: "user" | "assistant" | "system" | "context";
  message: string;
  timestamp: number;
  contextKey?: string;
}

const advancedModel = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

const fastModel = new ChatOllama({
  model: "gemma3n:e2b",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

export const createQueryTool = new DynamicStructuredTool({
  name: "createQuery",
  description: "Create a new shape with a query",
  schema: z.object({
    query: z
      .string()
      .describe("A valid postgres sql query to create a query node for"),
  }),
  func: async ({ query }: { query: string }): Promise<string> => query,
});

export const useExecutePrompt = (modelType: "fast" | "advanced") => {
  return async (messages: Message[] = []) => {
    const model =
      modelType === "advanced"
        ? advancedModel.bindTools([createQueryTool])
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
