import { useAtomValue } from "jotai";
import { DatabaseResult, schemaAtom } from "../../state";
import { useExecutePrompt } from "../Ai/useExecutePrompt";
import { useEffect, useRef, useState, useMemo } from "react";
import { useEditor, TLShapeId } from "tldraw";
import { Message } from "./ChatShape";
import { IconSend } from "@tabler/icons-react";
import Markdown from "react-markdown";

interface ChatProps {
  isEditing: boolean;
  data: DatabaseResult;
  query: string;
  messages: Message[];
  shapeId: TLShapeId;
}

export const Chat = ({
  isEditing,
  data,
  query,
  messages,
  shapeId,
}: ChatProps) => {
  const schema = useAtomValue(schemaAtom);
  const editor = useEditor();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Recreate the prompt when props change
  const runPrompt = useMemo(() => {
    const systemPrompt = `You are an expert data analyst that has been tasked with answering users questions about a dataset.

The query that generated the dataset looks like this:
${query}

And the database schema looks like this:
${JSON.stringify(schema)}

This has resulted in data that looks like this:

${JSON.stringify(data)}

Please provide clear, concise answers and format any numbers or data nicely for readability.`;

    return useExecutePrompt(systemPrompt);
  }, [query, schema, data]);

  const updateShapeMessages = (newMessages: Message[]) => {
    const shape = editor.getShape(shapeId);
    if (shape) {
      editor.updateShape({
        ...shape,
        props: {
          ...shape.props,
          messages: newMessages,
        },
      });
    }
  };

  const ask = async () => {
    if (!question.trim() || isLoading) return;

    const currentQuestion = question.trim();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      message: currentQuestion,
      timestamp: Date.now(),
    };

    const agentMessage: Message = {
      id: `agent-${Date.now()}`,
      sender: "agent",
      message: "",
      timestamp: Date.now(),
      isStreaming: true,
    };

    const newMessages = [...messages, userMessage, agentMessage];
    updateShapeMessages(newMessages);
    setQuestion("");
    setIsLoading(true);

    try {
      const stream = await runPrompt(currentQuestion);
      let output = "";

      for await (const chunk of stream) {
        output += chunk.text;

        // Update the streaming message in real-time
        const updatedMessages = [
          ...messages,
          userMessage,
          { ...agentMessage, message: output },
        ];
        updateShapeMessages(updatedMessages);
      }

      // Mark streaming as complete
      const finalMessages = [
        ...messages,
        userMessage,
        { ...agentMessage, message: output, isStreaming: false },
      ];
      updateShapeMessages(finalMessages);
    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessages = [
        ...messages,
        userMessage,
        {
          ...agentMessage,
          message: "Sorry, I encountered an error. Please try again.",
          isStreaming: false,
        },
      ];
      updateShapeMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  return (
    <div className="chat-container">
      <div
        ref={chatContainerRef}
        className="messages-container"
        style={{ pointerEvents: isEditing ? "all" : "auto" }}
      >
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-text">Ask questions about your dataset</div>
            <div className="empty-subtext">
              Get insights and analysis from your data
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender} ${message.isStreaming ? "streaming" : ""}`}
            >
              <div className="message-label">
                {message.sender === "user" ? "Question:" : "Analysis:"}
              </div>
              <div className="message-content">
                <Markdown>{message.message}</Markdown>
                {message.isStreaming && <span className="cursor">|</span>}
              </div>
            </div>
          ))
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
