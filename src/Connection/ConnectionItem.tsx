import { Group, Text } from "@mantine/core";
import { Connection } from "./types";
import "./WorkspacePanel";
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

  const truncatedUrl =
    redactedUrl.length > 42 ? redactedUrl.slice(0, 30) + "..." : redactedUrl;

  return (
    <div onClick={onActivate} className="connection" data-is-active={isActive}>
      <Group align="center" justify="space-between" h={30}>
        <Group align="center">
          <div
            className="color"
            style={{ backgroundColor: connection.color }}
          ></div>
          <Text
            size="xs"
            fw="bold"
            c={isActive ? "var(--text-color)" : "hsl(220deg, 40%, 70%)"}
          >
            {connection.name}
          </Text>
          <Text
            size="xs"
            c={isActive ? "hsl(0deg, 0%, 80%)" : "hsl(0deg, 0%, 50%)"}
          >
            {truncatedUrl}
          </Text>
        </Group>
        {isActive ? <IconCheck color="hsl(220deg, 40%, 80%)" /> : null}
      </Group>
    </div>
  );
};
