import { useAtomValue } from "jotai";
import { workspacesAtom } from "./state";
import { Workspace } from "./Workspace";
import { Group, Stack, Text } from "@mantine/core";
import "./WorkspacePopover.css";

export const WorkspacePopover = () => {
  const workspaces = useAtomValue(workspacesAtom);

  return (
    <div className="popover">
      <Stack gap="xl">
        <Group align="center" justify="space-between" w="100%">
          <Text>Workspaces</Text>
        </Group>
        <Stack gap={40} mah="60vh" style={{ overflowY: "auto" }}>
          {workspaces.map((workspace) => (
            <Workspace
              key={workspace.name}
              name={workspace.name}
              connections={workspace.connections}
            />
          ))}
        </Stack>
      </Stack>
    </div>
  );
};
