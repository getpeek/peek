import { ChatOllama } from "@langchain/ollama";

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
  systemPrompt: string,
  model: "advanced" | "fast" = "advanced",
) => {
  return async (prompt: string) => {
    if (model === "advanced") {
      return advancedModel.stream(["system", systemPrompt, ["user", prompt]]);
    }

    return fastModel.stream(["system", systemPrompt, ["user", prompt]]);
  };
};
