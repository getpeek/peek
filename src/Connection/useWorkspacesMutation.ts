import { invoke } from "@tauri-apps/api/core";
import { useAtomValue, useSetAtom } from "jotai";
import { configAtom } from "../state";
import { activeConnectionAtom, workspacesAtom } from "./state";
import type { Connection, Workspace } from "./types";

export const useWorkspacesMutation = () => {
  const workspaces = useAtomValue(workspacesAtom);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const setConfig = useSetAtom(configAtom);
  const setActiveConnection = useSetAtom(activeConnectionAtom);

  const commit = async (next: Workspace[]) => {
    await invoke("set_workspaces", { workspaces: next });
    setConfig(prev => (prev ? { ...prev, workspaces: next } : prev));
  };

  const addWorkspace = async (name: string) => {
    await commit([...workspaces, { name, connections: [] }]);
  };

  const renameWorkspace = async (oldName: string, newName: string) => {
    const next = workspaces.map(workspace =>
      workspace.name === oldName ? { ...workspace, name: newName } : workspace,
    );
    await commit(next);
    if (activeConnection?.workspaceName === oldName) {
      setActiveConnection({ ...activeConnection, workspaceName: newName });
    }
  };

  const removeWorkspace = async (name: string) => {
    await commit(workspaces.filter(workspace => workspace.name !== name));
    if (activeConnection?.workspaceName === name) {
      setActiveConnection(undefined);
    }
  };

  const addConnection = async (workspaceName: string, connection: Connection) => {
    const next = workspaces.map(workspace =>
      workspace.name === workspaceName
        ? { ...workspace, connections: [...workspace.connections, connection] }
        : workspace,
    );
    await commit(next);
  };

  const updateConnection = async (
    workspaceName: string,
    previousUrl: string,
    nextConnection: Connection,
  ) => {
    const next = workspaces.map(workspace =>
      workspace.name === workspaceName
        ? {
            ...workspace,
            connections: workspace.connections.map(connection =>
              connection.url === previousUrl ? nextConnection : connection,
            ),
          }
        : workspace,
    );
    await commit(next);
    if (
      activeConnection?.workspaceName === workspaceName &&
      activeConnection.connection.url === previousUrl
    ) {
      setActiveConnection({ workspaceName, connection: nextConnection });
    }
  };

  const removeConnection = async (workspaceName: string, url: string) => {
    const next = workspaces.map(workspace =>
      workspace.name === workspaceName
        ? {
            ...workspace,
            connections: workspace.connections.filter(connection => connection.url !== url),
          }
        : workspace,
    );
    await commit(next);
    if (
      activeConnection?.workspaceName === workspaceName &&
      activeConnection.connection.url === url
    ) {
      setActiveConnection(undefined);
    }
  };

  return {
    addWorkspace,
    renameWorkspace,
    removeWorkspace,
    addConnection,
    updateConnection,
    removeConnection,
  };
};
