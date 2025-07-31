import { DatabaseResult } from "../../state";
import { Message, useExecutePrompt } from "../Ai/useExecutePrompt";
import { useEffect, useRef, useState } from "react";
import { useEditor, TLShapeId } from "tldraw";
import { IconSend } from "@tabler/icons-react";
import { ChatEmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { ChatShape } from "./ChatShape";

interface ChatProps {
  isEditing: boolean;
  isSelected: boolean;
  data: DatabaseResult;
  query: string;
  messages: Message[];
  shapeId: TLShapeId;
}

export const Chat = ({
  isEditing,
  isSelected,
  data,
  query,
  messages,
  shapeId,
}: ChatProps) => {
  const editor = useEditor();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const runPrompt = useExecutePrompt("fast");

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, incomingMessage]);

  useEffect(() => {
    // data has changed, insert a new message with the new context
    const shape = editor.getShape<ChatShape>(shapeId);
    if (!shape) {
      return;
    }

    const oldMessages = shape.props.messages;
    const newMessage: Message = {
      type: "context",
      message: `Query: ${query}, result: ${JSON.stringify(data)}`,
      timestamp: Date.now(),
    };

    editor.updateShape({
      ...shape,
      props: {
        messages: [...oldMessages, newMessage],
      },
    });
  }, [query, data]);

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

    const stream = await runPrompt([...shape.props.messages, userMessage]);

    setIsLoading(true);
    let completeMessage = "";
    for await (const chunk of stream) {
      completeMessage += chunk.text;
      setIncomingMessage(completeMessage);
    }

    const updatedShape = editor.getShape<ChatShape>(shapeId);
    if (updatedShape) {
      editor.updateShape({
        ...updatedShape,
        props: {
          messages: [
            ...updatedShape.props.messages,
            {
              type: "assistant",
              message: completeMessage,
              timestamp: Date.now(),
            },
          ],
        },
      });
    }

    setIncomingMessage("");
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
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
          <MessageList
            messages={[
              {
                type: "assistant",
                message: incomingMessage,
                timestamp: Date.now(),
              },
            ]}
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
            onClick={ask}
            disabled={!question.trim() || isLoading}
            className={`send-button ${isLoading ? "loading" : ""}`}
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
