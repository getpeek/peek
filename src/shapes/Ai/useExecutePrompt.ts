import { ChatOllama } from "@langchain/ollama";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../state";

const model = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  streaming: true,
});

export const useExecutePrompt = () => {
  const schema = useAtomValue(schemaAtom);

  return async (prompt: string) => {
    const response = model.stream([
      "system",
      `you are an expert database administrator. You are tasked with writing Postgres SQL queries based on user requests.
      Here is the database schema. It contains all tables and their columns as well as a list of references between foreign keys for different tables.
      ${JSON.stringify(schema)}.

      Respond ONLY with the sql in text format, no backticks, formatting, comments or anything else. Just the sql query.
    `,
      ["user", prompt],
    ]);

    return response;
  };
};
