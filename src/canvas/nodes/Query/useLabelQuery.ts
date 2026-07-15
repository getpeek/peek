import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { configAtom, type Config } from "../../../state";
import { sessionStateAtom } from "../../../multiplayer/state";
import { useCanvas } from "../../hooks/useCanvas";
import { createPromptRunner, type Message } from "../../hooks/useExecutePrompt";
import type { QueryData } from "../../types";

const LABEL_SYSTEM_PROMPT =
  "You name SQL queries. Given a query, reply with a short human-readable title describing " +
  "what it returns — at most 6 words, Title Case, no punctuation, no quotes, no SQL. Reply " +
  "with the title only.";

const MAX_LABEL_LENGTH = 60;

// The model may wrap reasoning in <think> blocks and pad the answer with quotes
// or extra lines; keep the first non-empty line, unquoted and length-capped.
function cleanLabel(raw: string): string {
  const firstLine = raw
    .replaceAll(/<think>[\s\S]*?<\/think>/gu, "")
    .replaceAll(/<\/?think>/gu, "")
    .split("\n")
    .map(line => line.trim())
    .find(line => line.length > 0);
  if (!firstLine) {
    return "";
  }
  return firstLine.replaceAll(/^["'`]+|["'`]+$/gu, "").slice(0, MAX_LABEL_LENGTH);
}

async function generateLabel(query: string, config: Config): Promise<string> {
  const run = createPromptRunner({ tools: [], systemPrompt: LABEL_SYSTEM_PROMPT, config });
  const message: Message = { type: "user", message: query, timestamp: Date.now() };
  const stream = await run([message]);
  let text = "";
  for await (const chunk of stream) {
    text += chunk.text ?? "";
  }
  return cleanLabel(text);
}

// When `ai.automatically_label_queries` is on, a finished query run whose text
// hasn't been labeled yet gets a fresh AI-generated title. Staleness is tracked
// in component state rather than on the node: a changed query invalidates the
// label so the next run regenerates it, and an unchanged query (e.g. live-poll
// re-runs) never re-labels. Joiners skip it — they have no local model.
export function useLabelQuery(nodeId: string, data: QueryData): void {
  const config = useAtomValue(configAtom);
  const session = useAtomValue(sessionStateAtom);
  const canvas = useCanvas();
  const [labeledQuery, setLabeledQuery] = useState<string | null>(
    data.description ? data.query : null,
  );
  const wasRunning = useRef(data.isRunning ?? false);
  const isInitialQuery = useRef(true);

  // A changed query drops the existing label; keep the initial (seeded) value so
  // a description already present for the current query survives mounting.
  useEffect(() => {
    if (isInitialQuery.current) {
      isInitialQuery.current = false;
      return;
    }
    setLabeledQuery(null);
  }, [data.query]);

  useEffect(() => {
    const running = data.isRunning ?? false;
    const finished = wasRunning.current && !running;
    wasRunning.current = running;

    if (!finished || !config?.ai.automatically_label_queries) {
      return;
    }
    if (session?.role === "joiner" || !data.query.trim() || labeledQuery === data.query) {
      return;
    }

    let cancelled = false;
    void generateLabel(data.query, config).then(label => {
      if (cancelled || !label) {
        return;
      }
      canvas.updateNodeData<QueryData>(nodeId, { description: label });
      setLabeledQuery(data.query);
    });
    return () => {
      cancelled = true;
    };
  }, [data.isRunning]);
}
