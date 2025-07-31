import Markdown from "react-markdown";
import { Message } from "../Ai/useExecutePrompt";

interface MessageListProps {
  messages: Message[];
}
export const MessageList = ({ messages }: MessageListProps) => {
  return messages.map((message, i) => {
    if (message.type === "context") {
      return (
        <div key={i} className="message context">
          Context updated
        </div>
      );
    }
    return (
      <div key={i} className={`message ${message.type}`}>
        <div className="message-label">{message.type}</div>
        <div className="message-content">
          <Markdown>{message.message}</Markdown>
        </div>
      </div>
    );
  });
};
