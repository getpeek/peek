import { Message } from "../Ai/useExecutePrompt";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: Message[];
}
export const MessageList = ({ messages }: MessageListProps) => {
  return messages.map((message, i) => (
    <MessageItem key={`${message.timestamp}-${message.type}-${i}`} message={message} index={i} />
  ));
};
