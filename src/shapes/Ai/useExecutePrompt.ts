import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { ChatOllama } from "@langchain/ollama";

export interface Message {
  type: "user" | "assistant" | "system" | "context";
  message: string;
  timestamp: number;
}

const advancedModel = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

const fastModel = new ChatOllama({
  model: "gemma:latest",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

export const useExecutePrompt = (
  modelType: "advanced" | "fast" = "advanced",
) => {
  return async (messages: Message[] = []) => {
    const model = modelType === "advanced" ? advancedModel : fastModel;

    const conversation: BaseLanguageModelInput = [];

    for (const message of messages) {
      if (message.type === "context") {
        conversation.push([
          "user",
          `I've updated the sql query and it resulted in new data: ${message.message}`,
        ]);
        conversation.push([
          "assistant",
          `Ok! I've received the new query and data`,
        ]);
      } else {
        conversation.push([message.type, message.message]);
      }
    }

    return model.stream(conversation);
  };
};
