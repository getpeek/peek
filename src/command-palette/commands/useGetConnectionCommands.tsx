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
              width: 10,
              height: 10,
              borderRadius: 9999,
              boxShadow: `0 0 8px 1px ${workspace.connection.color}`,
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
