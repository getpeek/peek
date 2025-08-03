import { DatabaseResult } from "../../state";
import {
  branchToNewConversationTool,
  getAdditionalContextTool,
  Message,
  useExecutePrompt,
} from "../Ai/useExecutePrompt";
import { useEffect, useRef, useState } from "react";
import { useEditor, TLShapeId, createShapeId } from "tldraw";
import { IconSend, IconPlayerStop } from "@tabler/icons-react";
import { ChatEmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { MessageItem } from "./MessageItem";
import { ChatShape } from "./ChatShape";
import { sha1 } from "object-hash";
import { createArrowBetweenShapes } from "../../tools/createArrowBetweenShapes";
import { format } from "sql-formatter";
import { toCsv } from "../../tools/export/csv";

interface ChatProps {
  isEditing: boolean;
  isSelected: boolean;
  data: DatabaseResult;
  schema: {
    tables: Record<string, string[]>;
    references: Record<string, string[]>;
  };
  query: string;
  messages: Message[];
  shapeId: TLShapeId;
}

export const Chat = ({
  isEditing,
  isSelected,
  data,
  query,
  schema,
  messages,
  shapeId,
}: ChatProps) => {
  const editor = useEditor();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState("");
  const streamAbortRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const runPrompt = useExecutePrompt("advanced");

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, incomingMessage]);

  useEffect(() => {
    const shape = editor.getShape<ChatShape>(shapeId);
    if (!shape) {
      return;
    }

    const contextKey = sha1({ query, data, schema });

    const headers = (data.at(0) ?? []).map(([header]) => header).join(";");
    const rows = data.map((row) => row.map(([, value]) => value)).join(";");

    const alreadyExists = shape.props.messages.some(
      (msg) => msg.type === "context" && msg.contextKey === contextKey,
    );

    if (alreadyExists) {
      return;
    }

    const contextMessage: Message = {
      type: "context",
      message: `
      Query: ${query}

      schema: ${JSON.stringify(schema)}

      result:
      ${headers}
      ${rows}
      `,
      contextKey,
      timestamp: Date.now(),
    };

    editor.updateShape({
      ...shape,
      props: {
        ...shape.props,
        messages: [...shape.props.messages, contextMessage],
      },
    });
  }, [query, data, editor, shapeId]);

  const stopStream = () => {
    streamAbortRef.current = true;
    setIsLoading(false);

    if (incomingMessage.trim()) {
      const shape = editor.getShape<ChatShape>(shapeId);
      if (shape) {
        const partialMessage: Message = {
          type: "assistant",
          message: incomingMessage,
          timestamp: Date.now(),
        };

        editor.updateShape({
          ...shape,
          props: {
            messages: [...shape.props.messages, partialMessage],
          },
        });
      }
    }

    setIncomingMessage("");
  };

  const ask = async () => {
    const shape = editor.getShape<ChatShape>(shapeId);
    if (!shape) {
      return;
    }

    const userMessage: Message = {
      type: "user",
      message: question,
      timestamp: Date.now(),
    };

    editor.updateShape({
      ...shape,
      props: {
        messages: [...shape.props.messages, userMessage],
      },
    });

    setQuestion("");

    setIsLoading(true);
    streamAbortRef.current = false;
    const stream = await runPrompt([...shape.props.messages, userMessage]);

    let completeMessage = "";
    let queryCreated = false;
    try {
      for await (const chunk of stream) {
        if (streamAbortRef.current) break; // Stream was stopped
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
                const resultNodeId = createShapeId(
                  `${shape.id}-result-${Date.now()}`,
                );
                const bounds = editor.getShapePageBounds(shape);
                if (bounds) {
                  editor.createShape({
                    id: resultNodeId,
                    type: "result",
                    x: bounds.right + 100,
                    y: bounds.bottom + 50,
                    props: {
                      query: toolResult.query,
                      data: toolResult.data,
                      w: 400,
                      h: 300,
                    },
                  });
                  createArrowBetweenShapes(editor, shape.id, resultNodeId);
                }

                const csv = toCsv(toolResult.data);
                contextMessage = {
                  type: "context",
                  message: `The assistant executed this query: ${toolResult.query} and got this response

${csv}`,
                  timestamp: Date.now(),
                };
              } else {
                contextMessage = {
                  type: "context",
                  message: `The assistant executed this query: ${toolResult.query} but got an error:

${toolResult.error}`,
                  timestamp: Date.now(),
                };
              }

              const updatedShapeWithContext =
                editor.getShape<ChatShape>(shapeId);
              if (updatedShapeWithContext) {
                const newMessages = [
                  ...updatedShapeWithContext.props.messages,
                  contextMessage,
                ];
                editor.updateShape({
                  ...updatedShapeWithContext,
                  props: {
                    messages: newMessages,
                  },
                });

                // Continue the conversation with a request to summarize the new data
                const summarizeMessage: Message = {
                  type: "user",
                  message:
                    "Please provide a brief summary of the additional data you just retrieved and what insights it provides.",
                  timestamp: Date.now(),
                };

                const messagesWithSummaryRequest = [
                  ...newMessages,
                  summarizeMessage,
                ];
                const continueStream = await runPrompt(
                  messagesWithSummaryRequest,
                );
                for await (const continueChunk of continueStream) {
                  if (streamAbortRef.current) break; // Stream was stopped
                  if (
                    continueChunk.text === "<think>" ||
                    continueChunk.text === "</think>"
                  ) {
                    continue;
                  }
                  completeMessage += continueChunk.text;
                  setIncomingMessage(completeMessage);
                }
              }
            }

            if (call.name === "branchToNewConversation") {
              const result = await branchToNewConversationTool.func({
                query: call.args.query,
              });

              const queryNodeId = createShapeId(`${shape.id}-query`);

              const bounds = editor.getShapePageBounds(shape);
              if (!bounds) {
                return;
              }

              editor.createShape({
                id: queryNodeId,
                type: "query",
                x: bounds.right + 100,
                y: bounds.top,
                props: {
                  query: format(result, {
                    language: "postgresql",
                    keywordCase: "upper",
                    functionCase: "upper",
                  }),
                  w: 400,
                  h: 300,
                },
              });
              editor.select(queryNodeId);
              editor.zoomToSelection({ animation: { duration: 200 } });
              createArrowBetweenShapes(editor, shape.id, queryNodeId);

              queryCreated = true;
            }
          }
        }

        completeMessage += chunk.text;
        setIncomingMessage(completeMessage);
      }
    } catch (error) {
      console.error("Stream error:", error);
    }

    const updatedShape = editor.getShape<ChatShape>(shapeId);
    if (updatedShape && completeMessage && !streamAbortRef.current) {
      const messagesToAdd = [
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

      editor.updateShape({
        ...updatedShape,
        props: {
          messages: [...updatedShape.props.messages, ...messagesToAdd],
        },
      });
    }

    setIncomingMessage("");
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask().finally(() => setIsLoading(false));
    }
  };

  return (
    <div className={`chat-container ${isLoading ? "loading" : ""}`}>
      <div
        ref={chatContainerRef}
        className="messages-container"
        style={{
          pointerEvents: isEditing ? "all" : "auto",
          userSelect: isSelected || isEditing ? "text" : "none",
        }}
      >
        {messages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          <MessageList messages={messages} />
        )}
        {incomingMessage && (
          <MessageItem
            message={{
              type: "assistant",
              message: incomingMessage,
              timestamp: Date.now(),
            }}
            index={messages.length}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (inputRef.current) {
                inputRef.current.style.height = "auto";
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
              }
            }}
            onKeyDown={handleKeyPress}
            placeholder="Ask a question about your dataset..."
            className={`chat-input ${isLoading ? "loading" : ""}`}
            rows={1}
            disabled={isLoading}
            style={{ overflow: "hidden" }}
          />
          <button
            onClick={isLoading ? stopStream : ask}
            disabled={!isLoading && !question.trim()}
            className={`send-button ${isLoading ? "loading" : ""}`}
          >
            {isLoading ? <IconPlayerStop size={20} /> : <IconSend size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
