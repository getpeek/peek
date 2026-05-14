import { useMemo } from "react";
import { format } from "sql-formatter";
import { useSetAtom } from "jotai";
import {
  branchToNewConversationTool,
  getAdditionalContextTool,
  type Message,
} from "../../../shapes/Ai/useExecutePrompt";
import { toCsv } from "../../../tools/export/csv";
import { useCanvas } from "../../hooks/useCanvas";
import { ids } from "../../ids";
import { resultsAtom } from "../../state";
import type { ChatData, QueryNode, ResultNode } from "../../types";

const SOURCE_DEFAULT_W = 540;
const SOURCE_DEFAULT_H = 400;
const NODE_W = 400;
const NODE_H = 300;

export type ToolHandler = (args: unknown) => Promise<string>;
export type ToolHandlers = Record<string, ToolHandler>;

export function useChatTools(opts: { nodeId: string }): ToolHandlers {
  const { nodeId } = opts;
  const canvas = useCanvas();
  const setResults = useSetAtom(resultsAtom);

  return useMemo<ToolHandlers>(() => {
    return {
      getAdditionalContext: async args => {
        const { query } = args as { query: string };
        const toolResult = await getAdditionalContextTool.func({ query });
        if (!toolResult.success) {
          return `The query "${toolResult.query}" failed: ${toolResult.error}`;
        }

        const sourceNode = canvas.getNode(nodeId);
        if (sourceNode) {
          const resultId = ids.result(`${nodeId}-tool`, Date.now());
          const newResult: ResultNode = {
            id: resultId,
            type: "result",
            position: {
              x: sourceNode.position.x + (sourceNode.width ?? SOURCE_DEFAULT_W) + 100,
              y: sourceNode.position.y + (sourceNode.height ?? SOURCE_DEFAULT_H) + 50,
            },
            width: NODE_W,
            height: NODE_H,
            data: { query: toolResult.query },
          };
          setResults(prev => ({ ...prev, [resultId]: toolResult.data }));
          canvas.addNode(newResult);
          canvas.connect(nodeId, resultId);
          canvas.selectOnly(resultId);
          canvas.zoomToNode(resultId, { duration: 300 });
        }

        return `Executed query "${toolResult.query}"\n\n${toCsv(toolResult.data)}`;
      },

      branchToNewConversation: async args => {
        const { query } = args as { query: string };
        const queryText = (await branchToNewConversationTool.func({ query })) as string;
        const sourceNode = canvas.getNode(nodeId);
        if (!sourceNode) {
          return "Could not create query node: source not found";
        }

        const queryId = `${nodeId}-query`;
        const newQuery: QueryNode = {
          id: queryId,
          type: "query",
          position: {
            x: sourceNode.position.x + (sourceNode.width ?? SOURCE_DEFAULT_W) + 100,
            y: sourceNode.position.y,
          },
          width: NODE_W,
          height: NODE_H,
          data: {
            query: format(queryText, {
              language: "postgresql",
              keywordCase: "upper",
              functionCase: "upper",
            }),
          },
        };
        canvas.addNode(newQuery);
        canvas.connect(nodeId, queryId);
        canvas.selectOnly(queryId);
        canvas.zoomToNode(queryId, { duration: 200 });

        const systemMessage: Message = {
          type: "system",
          message: "Query created!",
          timestamp: Date.now(),
        };
        canvas.updateNodeData<ChatData>(nodeId, d => ({
          ...d,
          messages: [...d.messages, systemMessage],
        }));

        return `Created a new query node with: ${queryText}`;
      },
    };
  }, [canvas, setResults, nodeId]);
}
