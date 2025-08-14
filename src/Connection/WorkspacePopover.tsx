import { useAtom } from "jotai";
import "./WorkspacePopover.css";
import { workspaceIsEditModeAtom, workspacesAtom } from "./state";
import { Workspace } from "./Workspace";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconPencil, IconX } from "@tabler/icons-react";
import { AddWorkspaceForm } from "./AddWorkspaceForm";

export const WorkspacePopover = () => {
  const [workspaces, setWorkspaces] = useAtom(workspacesAtom);
  const [isEditing, setIsEditing] = useAtom(workspaceIsEditModeAtom);

  const addWorkspace = (name: string) => {
    setWorkspaces((prev) => [...prev, { name, connections: [] }]);
    setIsEditing(false);
  };

  return (
    <div className="popover">
      <Stack gap="xl">
        <Group align="center" justify="space-between" w="100%">
          <Text>Workspaces</Text>
          <Button
            variant="transparent"
            onClick={() => {
              setIsEditing((prev) => !prev);
            }}
            size="xs"
            c="#fff"
          >
            {isEditing ? (
              <IconX size={20} strokeWidth={1} />
            ) : (
              <IconPencil size={20} strokeWidth={1} />
            )}
          </Button>
        </Group>
        {isEditing && <AddWorkspaceForm onCreate={addWorkspace} />}
        <Stack gap={40}>
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
