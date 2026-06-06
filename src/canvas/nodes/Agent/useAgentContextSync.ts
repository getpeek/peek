import { useEffect } from "react";
import { sha1 } from "object-hash";
import { useAtomValue } from "jotai";
import { useCanvas } from "../../hooks/useCanvas";
import { edgesAtom, nodesAtom, resultsAtom } from "../../state";
import { schemaAtom } from "../../../state";
import type { AgentData, ResultNode } from "../../types";
import type { Message } from "../../../shapes/Ai/useExecutePrompt";

export function useAgentContextSync(opts: { nodeId: string }) {
  const { nodeId } = opts;
  const canvas = useCanvas();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const results = useAtomValue(resultsAtom);
  const schema = useAtomValue(schemaAtom);

  useEffect(() => {
    const candidates: Message[] = [];

    if (Object.keys(schema.tables).length > 0) {
      candidates.push({
        type: "context",
        contextKind: "schema",
        message: `Database schema:\n${JSON.stringify(schema)}`,
        contextKey: sha1({ kind: "schema", schema }),
        timestamp: Date.now(),
      });
    }

    for (const edge of edges.filter(e => e.target === nodeId)) {
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

      const headers = (rows.at(0) ?? []).map(([h]) => h).join(";");
      const body = rows.map(row => row.map(([, v]) => v)).join(";");
      candidates.push({
        type: "context",
        contextKind: "result",
        message: `\n      Query: ${source.data.query}\n\n      result:\n      ${headers}\n      ${body}\n      `,
        contextKey: sha1({ resultId: source.id, data: rows }),
        timestamp: Date.now(),
      });
    }

    if (candidates.length === 0) {
      return;
    }

    const agentNode = nodes.find(n => n.id === nodeId && n.type === "agent");
    if (!agentNode) {
      return;
    }
    const currentKeys = new Set(
      (agentNode.data as AgentData).messages.flatMap(m =>
        m.type === "context" && m.contextKey ? [m.contextKey] : [],
      ),
    );
    const fresh = candidates.filter(c => c.contextKey && !currentKeys.has(c.contextKey));
    if (fresh.length === 0) {
      return;
    }

    canvas.updateNodeData<AgentData>(nodeId, d => {
      const existing = new Set(
        d.messages.flatMap(m => (m.type === "context" && m.contextKey ? [m.contextKey] : [])),
      );
      const refreshed = fresh.filter(c => c.contextKey && !existing.has(c.contextKey));
      if (refreshed.length === 0) {
        return d;
      }
      return { ...d, messages: [...d.messages, ...refreshed] };
    });
  }, [nodeId, nodes, edges, results, schema, canvas]);
}
