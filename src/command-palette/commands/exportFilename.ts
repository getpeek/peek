import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { Config } from "../../state";

function fallbackFilename(query: string, ext: string): string {
  const base =
    query
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/giu, "_")
      .replaceAll(/^_+|_+$/gu, "")
      .slice(0, 40) || "export";
  return `${base}.${ext}`;
}

/**
 * A descriptive filename for an exported query result. Uses the configured
 * ollama endpoint to summarize the query when available; otherwise (or on
 * failure) derives a name from the query text, so export works without ollama.
 */
export async function exportFilename(
  config: Config | undefined,
  query: string,
  ext: "csv" | "json",
): Promise<string> {
  const ollama = config?.ai.ollama;
  if (!ollama) {
    return fallbackFilename(query, ext);
  }

  const model = new ChatOllama({
    model: ollama.model,
    baseUrl: ollama.url,
    streaming: false,
    numThread: 32,
    keepAlive: "10m",
    think: false,
  });

  try {
    const response = await model.invoke([
      new SystemMessage(
        `/no_think Your job is to create short, descriptive file names for sql queries that have been exported to ${ext}. Focus on the semantics of the query and convey that. Use only English characters, numbers and underscores and append .${ext} to the end of the filename. Reply **ONLY** with the file name, no thinking or reasoning output`,
      ),
      new HumanMessage(`The query is: ${query}`),
    ]);
    return (
      response.text.replaceAll(/<think>[\s]+<\/think>/giu, "").trim() ||
      fallbackFilename(query, ext)
    );
  } catch {
    return fallbackFilename(query, ext);
  }
}
