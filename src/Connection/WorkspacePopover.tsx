import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { ConnectionForm } from "./ConnectionForm";
import { WorkspaceForm } from "./WorkspaceForm";
import { WorkspaceList } from "./WorkspaceList";
import { activeConnectionAtom, workspacesAtom } from "./state";
import { useWorkspacesMutation } from "./useWorkspacesMutation";
import "./workspacePicker.css";
import type { Connection } from "./types";

type View =
  | { kind: "list" }
  | { kind: "edit-connection"; workspaceName: string; connection: Connection }
  | { kind: "add-connection"; workspaceName: string }
  | { kind: "edit-workspace"; workspaceName: string }
  | { kind: "add-workspace" };

interface WorkspacePopoverProps {
  onClose: () => void;
}

export const WorkspacePopover = ({ onClose }: WorkspacePopoverProps) => {
  const workspaces = useAtomValue(workspacesAtom);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const setActiveConnection = useSetAtom(activeConnectionAtom);
  const mutations = useWorkspacesMutation();

  const [view, setView] = useState<View>({ kind: "list" });
  const [expandedNames, setExpandedNames] = useState<Set<string>>(
    () => new Set(activeConnection ? [activeConnection.workspaceName] : []),
  );

  useEffect(() => {
    if (activeConnection) {
      setExpandedNames(prev => {
        if (prev.has(activeConnection.workspaceName)) {
          return prev;
        }
        return new Set([...prev, activeConnection.workspaceName]);
      });
    }
  }, [activeConnection]);

  const goBack = () => setView({ kind: "list" });

  const toggleExpand = (name: string) => {
    setExpandedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleActivate = (workspaceName: string, connection: Connection) => {
    setActiveConnection({ workspaceName, connection });
    onClose();
  };

  const handleDuplicateConnection = async (workspaceName: string, connection: Connection) => {
    const copy: Connection = {
      ...connection,
      name: `${connection.name} copy`,
      url: connection.url,
    };
    await mutations.addConnection(workspaceName, copy);
  };

  const renderContent = () => {
    switch (view.kind) {
      case "list":
        return (
          <WorkspaceList
            workspaces={workspaces}
            activeWorkspaceName={activeConnection?.workspaceName}
            activeConnectionUrl={activeConnection?.connection.url}
            expandedNames={expandedNames}
            onToggleExpand={toggleExpand}
            onActivate={handleActivate}
            onEditConnection={(workspaceName, connection) =>
              setView({ kind: "edit-connection", workspaceName, connection })
            }
            onAddConnection={workspaceName => setView({ kind: "add-connection", workspaceName })}
            onRemoveConnection={(workspaceName, connection) =>
              setView({ kind: "edit-connection", workspaceName, connection })
            }
            onDuplicateConnection={handleDuplicateConnection}
            onEditWorkspace={workspaceName => setView({ kind: "edit-workspace", workspaceName })}
            onRemoveWorkspace={workspaceName => setView({ kind: "edit-workspace", workspaceName })}
            onAddWorkspace={() => setView({ kind: "add-workspace" })}
          />
        );
      case "edit-connection":
        return (
          <ConnectionForm
            mode='edit'
            workspaceName={view.workspaceName}
            initialConnection={view.connection}
            onBack={goBack}
            onClose={onClose}
            onSave={async next => {
              await mutations.updateConnection(view.workspaceName, view.connection.url, next);
              goBack();
            }}
            onRemove={async () => {
              await mutations.removeConnection(view.workspaceName, view.connection.url);
              goBack();
            }}
          />
        );
      case "add-connection":
        return (
          <ConnectionForm
            mode='add'
            workspaceName={view.workspaceName}
            onBack={goBack}
            onClose={onClose}
            onSave={async connection => {
              await mutations.addConnection(view.workspaceName, connection);
              goBack();
            }}
          />
        );
      case "edit-workspace": {
        const workspace = workspaces.find(w => w.name === view.workspaceName);
        return (
          <WorkspaceForm
            mode='edit'
            initialName={view.workspaceName}
            connectionCount={workspace?.connections.length ?? 0}
            onBack={goBack}
            onClose={onClose}
            onSave={async newName => {
              if (newName !== view.workspaceName) {
                await mutations.renameWorkspace(view.workspaceName, newName);
              }
              goBack();
            }}
            onRemove={async () => {
              await mutations.removeWorkspace(view.workspaceName);
              goBack();
            }}
          />
        );
      }
      case "add-workspace":
        return (
          <WorkspaceForm
            mode='add'
            onBack={goBack}
            onClose={onClose}
            onSave={async name => {
              await mutations.addWorkspace(name);
              goBack();
            }}
          />
        );
    }
  };

  return <div className='picker-popover'>{renderContent()}</div>;
};
