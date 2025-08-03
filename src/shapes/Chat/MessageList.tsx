import Markdown from "react-markdown";
import { Message } from "../Ai/useExecutePrompt";
import { IconRobot } from "@tabler/icons-react";
import { Group, Stack, Text } from "@mantine/core";

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
            c="var(--context-message)"
            bd={`2px solid var(--mantine-color-green-8)`}
            py={16}
            px={8}
            align="center"
            justify="center"
            style={{ borderRadius: 9999 }}
          >
            <IconRobot size={20} color="var(--context-message)" />
            <Stack gap={2}>
              <Text fw="bold">
                {i === 0 ? "Context inserted" : "Context updated"}!
              </Text>
              <Text size="xs" c="var(--context-message-subtle)">
                {i === 0 ? "Query and result" : "Updated query and result"}
              </Text>
            </Stack>
          </Group>
        </div>
      );
    } else if (message.type === "system") {
      if (i === 0) {
        return null;
      }

      return (
        <div key={i} className="message context">
          <Group
            w={300}
            c="var(--system-message)"
            bd={`2px solid var(--mantine-color-blue-8)`}
            py={16}
            px={8}
            align="center"
            justify="center"
            style={{ borderRadius: 9999 }}
          >
            <IconRobot size={20} color="var(--system-message)" />
            <Stack gap={2}>
              <Text fw="bold">{message.message}</Text>
              <Text size="xs" c="var(--system-message-subtle)">
                Just for you
              </Text>
            </Stack>
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
