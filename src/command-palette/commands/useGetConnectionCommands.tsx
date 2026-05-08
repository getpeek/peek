import { useAtomValue, useSetAtom } from "jotai";
import { activeConnectionAtom, workspacesAtom } from "../../Connection/state";
import { CommandPaletteResult } from ".";
import { ConnectionDetails } from "../details/ConnectionDetails";

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
    .map(({ workspaceName, connection }) => ({
      icon: (
        <div
          className='connection-color-dot'
          style={{
            background: connection.color,
            boxShadow: `0 0 8px 1px ${connection.color}`,
          }}
        />
      ),
      label: connection.name,
      description: workspaceName,
      searchAgainst: `connection ${connection.name} ${workspaceName}`,
      details: <ConnectionDetails workspaceName={workspaceName} connection={connection} />,
      onSelect() {
        setActiveConnection({ workspaceName, connection });
      },
    }));
};
