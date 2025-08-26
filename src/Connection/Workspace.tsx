import { useAtom } from "jotai";
import { activeConnectionAtom } from "./state";
import { Group, Stack, Text } from "@mantine/core";
import { ConnectionItem } from "./ConnectionItem";
import { Connection } from "./types";
import "./WorkspacePanel.css";

interface WorkspaceProps {
  name: string;
  connections: Connection[];
}
export const Workspace = ({ name, connections }: WorkspaceProps) => {
  const [activeConnection, setActiveConnection] = useAtom(activeConnectionAtom);

  return (
    <Stack gap="xs">
      <Group align="center" justify="space-between">
        <Text size="xs" fw="bold" pos="sticky" c="var(--text-color)">
          {name}
        </Text>
      </Group>
      <Stack gap={0}>
        {connections.map((connection) => (
          <ConnectionItem
            key={connection.url}
            connection={connection}
            isActive={connection.url === activeConnection?.connection.url}
            onActivate={() =>
              setActiveConnection({ workspaceName: name, connection })
            }
          />
        ))}
      </Stack>
    </Stack>
  );
};
