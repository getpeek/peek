import { useAtom, useSetAtom } from "jotai";
import { activeConnectionAtom, workspacesAtom } from "./state";
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
  const setWorkspaces = useSetAtom(workspacesAtom);

  const removeConnection = (connection: Connection) => {
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = prevWorkspaces.map((workspace) => {
        if (workspace.name === name) {
          return {
            ...workspace,
            connections: workspace.connections.filter(
              (conn) => conn.url !== connection.url,
            ),
          };
        }
        return workspace;
      });
      return updatedWorkspaces;
    });
  };

  return (
    <Stack gap="lg">
      <Group align="start">
        <Text size="xs" fw="bold" h={4} pos="sticky">
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
            onRemove={() => {
              removeConnection(connection);
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
};
