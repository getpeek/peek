import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  activeConnectionAtom,
  workspaceIsEditModeAtom,
  workspacesAtom,
} from "./state";
import { Group, Stack, Text } from "@mantine/core";
import { ConnectionItem } from "./ConnectionItem";
import { Connection } from "./types";
import { ConnectionForm } from "./ConnectionForm";
import "./WorkspacePanel.css";

interface WorkspaceProps {
  name: string;
  connections: Connection[];
}
export const Workspace = ({ name, connections }: WorkspaceProps) => {
  const [activeConnection, setActiveConnection] = useAtom(activeConnectionAtom);
  const isEditing = useAtomValue(workspaceIsEditModeAtom);
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
            onRemove={() => {
              removeConnection(connection);
            }}
          />
        ))}
      </Stack>
      {isEditing && <ConnectionForm workspaceName={name} />}
    </Stack>
  );
};
