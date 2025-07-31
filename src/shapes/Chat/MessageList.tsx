import Markdown from "react-markdown";
import { Message } from "../Ai/useExecutePrompt";
import { IconRobotFace } from "@tabler/icons-react";
import { Group, Text } from "@mantine/core";

interface MessageListProps {
  messages: Message[];
}
export const MessageList = ({ messages }: MessageListProps) => {
  return messages.map((message, i) => {
    if (message.type === "context") {
      return (
        <div key={i} className="message context">
          <Group
            w={300}
            c="dark-2"
            py={16}
            px={8}
            bg="var(--context-message)"
            align="center"
            justify="center"
            style={{ borderRadius: 9999 }}
          >
            <IconRobotFace size={20} color="var(--mantine-color-blue-6)" />
            <Text>Context updated!</Text>{" "}
          </Group>
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
