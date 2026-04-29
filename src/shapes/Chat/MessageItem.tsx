import Markdown from "react-markdown";
import { Message } from "../Ai/useExecutePrompt";
import { IconRobot } from "@tabler/icons-react";
import { Group, Stack, Text } from "@mantine/core";
import remarkGfm from "remark-gfm";

interface MessageItemProps {
  message: Message;
  index: number;
}

export const MessageItem = ({ message, index }: MessageItemProps) => {
  if (message.type === "context") {
    return (
      <div className="message context">
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
            <Text fw="bold">{index === 0 ? "Context inserted" : "Context updated"}!</Text>
            <Text size="xs" c="var(--context-message-subtle)">
              {index === 0 ? "Query and result" : "Updated query and result"}
            </Text>
          </Stack>
        </Group>
      </div>
    );
  }

  if (message.type === "system") {
    if (index === 0) {
      return null;
    }

    return (
      <div className="message context">
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
    <div className={`message ${message.type}`}>
      <div className="message-label">{message.type}</div>
      <div className="message-content">
        <Markdown remarkPlugins={[remarkGfm]}>{message.message}</Markdown>
      </div>
    </div>
  );
};
