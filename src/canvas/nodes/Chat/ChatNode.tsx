import { NodeProps, NodeResizer } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { format } from "sql-formatter";
import { sha1 } from "object-hash";
import { useSetAtom } from "jotai";
import { IconPlayerStop, IconSend } from "@tabler/icons-react";
import { ChatEmptyState } from "../../../shapes/Chat/EmptyState";
import { MessageItem } from "../../../shapes/Chat/MessageItem";
import { MessageList } from "../../../shapes/Chat/MessageList";
import {
  branchToNewConversationTool,
  getAdditionalContextTool,
  type Message,
  useExecutePrompt,
} from "../../../shapes/Ai/useExecutePrompt";
import { toCsv } from "../../../tools/export/csv";
import { useCanvas } from "../../useCanvas";
import { ids } from "../../ids";
import { resultsAtom } from "../../state";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import type { ChatNode as ChatNodeT, QueryNode, ResultNode } from "../../types";
import "../../../shapes/Chat/Chat.css";
import "../node.css";

const DEFAULT_W = 540;
const DEFAULT_H = 400;

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 0);
  return line ? line.trim().slice(0, 40) : "";
}

export function ChatNode({ id, data, selected, width, height }: NodeProps<ChatNodeT>) {
  const canvas = useCanvas();
  const setResults = useSetAtom(resultsAtom);
  const runPrompt = useExecutePrompt("advanced");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState("");
  const streamAbortRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages.length, incomingMessage]);

  // Sync upstream result data into context messages
  useEffect(() => {
    if (data.result.length === 0) {
      return;
    }
    const contextKey = sha1({
      query: data.query,
      data: data.result,
      schema: data.schema,
    });
    const exists = data.messages.some((m) => m.type === "context" && m.contextKey === contextKey);
    if (exists) {
      return;
    }

    const headers = (data.result.at(0) ?? []).map(([h]) => h).join(";");
    const rows = data.result.map((row) => row.map(([, v]) => v)).join(";");
    const contextMessage: Message = {
      type: "context",
      message: `\n      Query: ${data.query}\n\n      schema: ${JSON.stringify(data.schema)}\n\n      result:\n      ${headers}\n      ${rows}\n      `,
      contextKey,
      timestamp: Date.now(),
    };
    canvas.updateNodeData<ChatNodeT["data"]>(id, (d) => ({
      ...d,
      messages: [...d.messages, contextMessage],
    }));
  }, [data.query, data.result, data.schema, data.messages, id, canvas]);

  const stopStream = () => {
    streamAbortRef.current = true;
    setIsLoading(false);
    if (incomingMessage.trim()) {
      const partial: Message = {
        type: "assistant",
        message: incomingMessage,
        timestamp: Date.now(),
      };
      canvas.updateNodeData<ChatNodeT["data"]>(id, (d) => ({
        ...d,
        messages: [...d.messages, partial],
      }));
    }
    setIncomingMessage("");
  };

  const ask = async () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "chat" || !question.trim()) {
      return;
    }
    const currentMessages = (node.data as ChatNodeT["data"]).messages;

    const userMessage: Message = {
      type: "user",
      message: question,
      timestamp: Date.now(),
    };
    canvas.updateNodeData<ChatNodeT["data"]>(id, (d) => ({
      ...d,
      messages: [...d.messages, userMessage],
    }));
    setQuestion("");
    setIsLoading(true);
    streamAbortRef.current = false;

    const stream = await runPrompt([...currentMessages, userMessage]);

    let completeMessage = "";
    let queryCreated = false;
    try {
      for await (const chunk of stream) {
        if (streamAbortRef.current) {
          break;
        }
        if (chunk.text === "<think>" || chunk.text === "</think>") {
          continue;
        }

        if (chunk.tool_calls?.length) {
          for (const call of chunk.tool_calls) {
            if (call.name === "getAdditionalContext") {
              const toolResult = await getAdditionalContextTool.func({
                query: call.args.query,
              });
              let contextMessage: Message;

              if (toolResult.success) {
                const sourceNode = canvas.getNode(id);
                if (sourceNode) {
                  const resultId = ids.result(`${id}-tool`, Date.now());
                  const newResult: ResultNode = {
                    id: resultId,
                    type: "result",
                    position: {
                      x: sourceNode.position.x + (sourceNode.width ?? DEFAULT_W) + 100,
                      y: sourceNode.position.y + (sourceNode.height ?? DEFAULT_H) + 50,
                    },
                    width: 400,
                    height: 300,
                    data: {
                      query: toolResult.query,
                    },
                  };
                  setResults((prev) => ({
                    ...prev,
                    [resultId]: toolResult.data,
                  }));
                  canvas.addNode(newResult);
                  canvas.connect(id, resultId);
                  canvas.selectOnly(resultId);
                  canvas.zoomToNode(resultId, { duration: 300 });
                }
                const csv = toCsv(toolResult.data);
                contextMessage = {
                  type: "context",
                  message: `The assistant executed this query: ${toolResult.query} and got this response\n\n${csv}`,
                  timestamp: Date.now(),
                };
              } else {
                contextMessage = {
                  type: "context",
                  message: `The assistant executed this query: ${toolResult.query} but got an error:\n\n${toolResult.error}`,
                  timestamp: Date.now(),
                };
              }
              canvas.updateNodeData<ChatNodeT["data"]>(id, (d) => ({
                ...d,
                messages: [...d.messages, contextMessage],
              }));

              const summarizeMessage: Message = {
                type: "user",
                message:
                  "Please provide a brief summary of the additional data you just retrieved and what insights it provides.",
                timestamp: Date.now(),
              };
              const updated = canvas.getNode(id);
              if (updated && updated.type === "chat") {
                const continueStream = await runPrompt([
                  ...(updated.data as ChatNodeT["data"]).messages,
                  summarizeMessage,
                ]);
                for await (const cont of continueStream) {
                  if (streamAbortRef.current) {
                    break;
                  }
                  if (cont.text === "<think>" || cont.text === "</think>") {
                    continue;
                  }
                  completeMessage += cont.text;
                  setIncomingMessage(completeMessage);
                }
              }
            }

            if (call.name === "branchToNewConversation") {
              const queryText = await branchToNewConversationTool.func({
                query: call.args.query,
              });
              const sourceNode = canvas.getNode(id);
              if (sourceNode) {
                const queryId = `${id}-query`;
                const newQuery: QueryNode = {
                  id: queryId,
                  type: "query",
                  position: {
                    x: sourceNode.position.x + (sourceNode.width ?? DEFAULT_W) + 100,
                    y: sourceNode.position.y,
                  },
                  width: 400,
                  height: 300,
                  data: {
                    query: format(queryText, {
                      language: "postgresql",
                      keywordCase: "upper",
                      functionCase: "upper",
                    }),
                  },
                };
                canvas.addNode(newQuery);
                canvas.connect(id, queryId);
                canvas.selectOnly(queryId);
                canvas.zoomToNode(queryId, { duration: 200 });
                queryCreated = true;
              }
            }
          }
        }

        completeMessage += chunk.text;
        setIncomingMessage(completeMessage);
      }
    } catch (e) {
      console.error("Stream error:", e);
    }

    if (completeMessage && !streamAbortRef.current) {
      const messagesToAdd: Message[] = [
        {
          type: "assistant",
          message: completeMessage,
          timestamp: Date.now(),
        },
      ];
      if (queryCreated) {
        messagesToAdd.push({
          type: "system",
          message: "Query created!",
          timestamp: Date.now(),
        });
      }
      canvas.updateNodeData<ChatNodeT["data"]>(id, (d) => ({
        ...d,
        messages: [...d.messages, ...messagesToAdd],
      }));
    }

    setIncomingMessage("");
    setIsLoading(false);
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={400} minHeight={300} />
      <HiddenHandles />
      <div
        className={`app-node ${selected ? "selected" : ""} ${isLoading ? "loading" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader
          nodeId={id}
          type="chat"
          name={data.query ? `chat · ${firstLine(data.query)}` : "new conversation"}
        />
        <div className="app-node-body nodrag" ref={bodyRef}>
          <div className="chat-container">
            <div className="messages-container">
              {data.messages.length === 0 ? (
                <ChatEmptyState />
              ) : (
                <MessageList messages={data.messages} />
              )}
              {incomingMessage && (
                <MessageItem
                  message={{
                    type: "assistant",
                    message: incomingMessage,
                    timestamp: Date.now(),
                  }}
                  index={data.messages.length}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-container">
              <div className="input-wrapper">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading) {
                        ask().finally(() => setIsLoading(false));
                      }
                    }
                  }}
                  placeholder="Ask a question about your dataset..."
                  className={`chat-input ${isLoading ? "loading" : ""}`}
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={() =>
                    isLoading ? stopStream() : ask().finally(() => setIsLoading(false))
                  }
                  disabled={!isLoading && !question.trim()}
                  className={`send-button ${isLoading ? "loading" : ""}`}
                >
                  {isLoading ? <IconPlayerStop size={20} /> : <IconSend size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
