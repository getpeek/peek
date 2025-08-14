import { useAtom, useSetAtom } from "jotai";
import { activeConnectionAtom, workspacesAtom } from "./state";
import { Button, Group, Stack, Text } from "@mantine/core";
import { ConnectionItem } from "./ConnectionItem";
import { Connection } from "./types";
import "./WorkspacePanel.css";
import { IconPencil } from "@tabler/icons-react";
import { ConnectionForm } from "./ConnectionForm";
import { useState } from "react";

interface WorkspaceProps {
  name: string;
  connections: Connection[];
}
export const Workspace = ({ name, connections }: WorkspaceProps) => {
  const [activeConnection, setActiveConnection] = useAtom(activeConnectionAtom);
  const [isEditing, setIsEditing] = useState(false);
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
        <Button
          size="xs"
          variant="transparent"
          c="hsla(0deg, 0%, 90%, 0.5)"
          onClick={() => setIsEditing((prev) => !prev)}
        >
          <IconPencil size={16} color="hsla(0deg, 0%, 90%, 0.5)" />
        </Button>
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
