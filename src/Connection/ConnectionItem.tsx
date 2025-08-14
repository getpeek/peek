import { Group, Text } from "@mantine/core";
import { Connection } from "./types";
import "./WorkspacePanel.css";
import { IconCheck } from "@tabler/icons-react";

interface ConnectionItemProps {
  isActive: boolean;
  connection: Connection;
  onActivate: () => void;
  onRemove: () => void;
}

export const ConnectionItem = ({
  isActive,
  connection,
  onActivate,
}: ConnectionItemProps) => {
  const redactedUrl = connection.url.replace(
    /(postgres:\/\/[^:]+:)[^@]+(@)/,
    "$1*****$2",
  );

  return (
    <div onClick={onActivate} className="connection" data-is-active={isActive}>
      <Group align="center" justify="space-between" h={30}>
        <Group align="center">
          <div
            className="color"
            style={{ backgroundColor: connection.color }}
          />
          <Text
            size="xs"
            fw="bold"
            c={isActive ? "var(--text-color)" : "hsl(220deg, 40%, 70%)"}
            truncate="end"
            maw={80}
          >
            {connection.name}
          </Text>
          <Text
            size="xs"
            maw={250}
            c={isActive ? "hsl(0deg, 0%, 80%)" : "hsl(0deg, 0%, 50%)"}
            truncate="end"
          >
            {redactedUrl}
          </Text>
        </Group>
        {isActive ? <IconCheck color="hsl(220deg, 40%, 80%)" /> : null}
      </Group>
    </div>
  );
};
