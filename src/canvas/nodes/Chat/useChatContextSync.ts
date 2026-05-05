import { useEffect } from "react";
import { sha1 } from "object-hash";
import { useAtomValue } from "jotai";
import { useCanvas } from "../../hooks/useCanvas";
import { edgesAtom, nodesAtom, resultsAtom } from "../../state";
import { schemaAtom } from "../../../state";
import type { ChatData, ResultNode } from "../../types";
import type { Message } from "../../../shapes/Ai/useExecutePrompt";

export function useChatContextSync(opts: { nodeId: string; messages: Message[] }) {
  const { nodeId, messages } = opts;
  const canvas = useCanvas();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const results = useAtomValue(resultsAtom);
  const schema = useAtomValue(schemaAtom);

  useEffect(() => {
    const newMessages: Message[] = [];
    const hasTables = Object.keys(schema.tables).length > 0;

    if (hasTables) {
      const schemaKey = sha1({ kind: "schema", schema });
      const exists = messages.some(m => m.type === "context" && m.contextKey === schemaKey);
      if (!exists) {
        newMessages.push({
          type: "context",
          message: `Database schema:\n${JSON.stringify(schema)}`,
          contextKey: schemaKey,
          timestamp: Date.now(),
        });
      }
    }

    const incoming = edges.filter(e => e.target === nodeId);
    for (const edge of incoming) {
      const source = nodes.find(
        (n): n is ResultNode => n.id === edge.source && n.type === "result",
      );
      if (!source) {
        continue;
      }
      const rows = results[source.id] ?? [];
      if (rows.length === 0) {
        continue;
      }

      const contextKey = sha1({ resultId: source.id, data: rows });
      const exists = messages.some(m => m.type === "context" && m.contextKey === contextKey);
      if (exists) {
        continue;
      }

      const headers = (rows.at(0) ?? []).map(([h]) => h).join(";");
      const body = rows.map(row => row.map(([, v]) => v)).join(";");
      newMessages.push({
        type: "context",
        message: `\n      Query: ${source.data.query}\n\n      result:\n      ${headers}\n      ${body}\n      `,
        contextKey,
        timestamp: Date.now(),
      });
    }

    if (newMessages.length === 0) {
      return;
    }

    canvas.updateNodeData<ChatData>(nodeId, d => ({
      ...d,
      messages: [...d.messages, ...newMessages],
    }));
  }, [nodeId, nodes, edges, results, schema, messages, canvas]);
}
