import { ChatOllama } from "@langchain/ollama";

const model = new ChatOllama({
  model: "gemma:latest",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

export const useExecutePrompt = (systemPrompt: string) => {
  return async (prompt: string) => {
    const response = model.stream(["system", systemPrompt, ["user", prompt]]);

    return response;
  };
};
