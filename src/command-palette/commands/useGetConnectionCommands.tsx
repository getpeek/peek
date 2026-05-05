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
      icon: (
        <div
          className='connection-color-dot'
          style={{
            background: workspace.connection.color,
            boxShadow: `0 0 8px 1px ${workspace.connection.color}`,
          }}
        />
      ),
      label: workspace.connection.name,
      description: workspace.workspaceName,
      searchAgainst: "connection",
      onSelect() {
        setActiveConnection({
          workspaceName: workspace.workspaceName,
          connection: workspace.connection,
        });
      },
    }));
};
