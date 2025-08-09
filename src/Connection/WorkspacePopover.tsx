import { useAtomValue } from "jotai";
import "./WorkspacePopover.css";
import { workspacesAtom } from "./state";
import { Workspace } from "./Workspace";
import { Stack } from "@mantine/core";

export const WorkspacePopover = () => {
  const workspaces = useAtomValue(workspacesAtom);

  return (
    <div className="popover">
      <Stack gap={40}>
        {workspaces.map((workspace) => (
          <Workspace
            key={workspace.name}
            name={workspace.name}
            connections={workspace.connections}
          />
        ))}
      </Stack>
    </div>
  );
};
