import { Group, Text } from "@mantine/core";
import { useAtomValue, useSetAtom } from "jotai";
import { activeConnectionAtom, workspacesAtom } from "../../Connection/state";
import { CommandPaletteResult } from ".";

export const useGetConnectionCommands = (): CommandPaletteResult[] => {
  const workspaces = useAtomValue(workspacesAtom);
  const setActiveConnection = useSetAtom(activeConnectionAtom);

  return workspaces
    .flatMap(workspace =>
      workspace.connections.map(connection => ({
        workspaceName: workspace.name,
        connection,
      })),
    )
    .map(workspace => ({
      searchAgainst: workspace.workspaceName + " " + workspace.connection.name,
      icon: null,
      label: (
        <Group gap='xs' align='center'>
          <div
            className='color'
            style={{
              background: workspace.connection.color,
              width: 12,
              height: 12,
            }}
          />
          <Text size='xs'>{workspace.connection.name}</Text>
        </Group>
      ),
      description: (
        <Text size='xs' c='var(--text-color-subtle)'>
          {workspace.workspaceName}
        </Text>
      ),
      onSelect() {
        setActiveConnection({
          workspaceName: workspace.workspaceName,
          connection: workspace.connection,
        });
      },
    }));
};
