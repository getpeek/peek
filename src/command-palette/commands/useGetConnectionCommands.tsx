import { Group, Text } from "@mantine/core";
import { IconNetwork } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { activeConnectionAtom } from "../../Connection/state";
import { useWorkspaces } from "../../db";

export const useGetConnectionCommands = () => {
  const connections = useWorkspaces();
  const setActiveConnection = useSetAtom(activeConnectionAtom);

  return connections.workspaces
    .flatMap((workspace) =>
      workspace.connections.map((connection) => ({
        workspaceName: workspace.name,
        connection,
      })),
    )
    .map((workspace) => ({
      searchAgainst: workspace.workspaceName + " " + workspace.connection.name,
      icon: <IconNetwork size={16} />,
      label: (
        <Group gap="md" align="center">
          <div
            className="color"
            style={{
              background: workspace.connection.color,
              width: 12,
              height: 12,
            }}
          />
          <Text size="xs">
            {workspace.workspaceName} - {workspace.connection.name}
          </Text>
        </Group>
      ),
      onSelect() {
        setActiveConnection({
          workspaceName: workspace.workspaceName,
          connection: workspace.connection,
        });
      },
    }));
};
