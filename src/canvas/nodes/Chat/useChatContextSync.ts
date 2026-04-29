import { useEffect } from "react";
import { sha1 } from "object-hash";
import { useCanvas } from "../../useCanvas";
import type { ChatData, ChatSchema } from "../../types";
import type { Message } from "../../../shapes/Ai/useExecutePrompt";
import type { DatabaseResult } from "../../../state";

export function useChatContextSync(opts: {
  nodeId: string;
  query: string;
  result: DatabaseResult;
  schema: ChatSchema;
  messages: Message[];
}) {
  const { nodeId, query, result, schema, messages } = opts;
  const canvas = useCanvas();

  useEffect(() => {
    if (result.length === 0) {
      return;
    }
    const contextKey = sha1({ query, data: result, schema });
    const exists = messages.some(m => m.type === "context" && m.contextKey === contextKey);
    if (exists) {
      return;
    }

    const headers = (result.at(0) ?? []).map(([h]) => h).join(";");
    const rows = result.map(row => row.map(([, v]) => v)).join(";");
    const contextMessage: Message = {
      type: "context",
      message: `\n      Query: ${query}\n\n      schema: ${JSON.stringify(schema)}\n\n      result:\n      ${headers}\n      ${rows}\n      `,
      contextKey,
      timestamp: Date.now(),
    };
    canvas.updateNodeData<ChatData>(nodeId, d => ({
      ...d,
      messages: [...d.messages, contextMessage],
    }));
  }, [query, result, schema, messages, nodeId, canvas]);
}
