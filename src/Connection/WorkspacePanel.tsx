import { useAtom } from "jotai";
import { workspacesAtom } from "./state";
import { Button, Divider, Group, Input, Stack } from "@mantine/core";
import "./WorkspacePanel.css";
import { Workspace } from "./Workspace";
import { Fragment } from "react/jsx-runtime";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";

interface WorkspaceForm {
  name: string;
}

export const WorkspacePanel = () => {
  const [workspaces, setWorkspaces] = useAtom(workspacesAtom);

  const onCreateWorkspace = (values: WorkspaceForm) => {
    if (values.name.length > 0) {
      setWorkspaces([{ name: values.name, connections: [] }, ...workspaces]);
    }
  };

  const form = useForm({
    initialValues: {
      name: "",
    },
  });

  return (
    <Stack gap="lg" mah={800}>
      <form onSubmit={form.onSubmit(onCreateWorkspace)}>
        <Group gap="md" align="center">
          <Input
            {...form.getInputProps("name")}
            variant="default"
            placeholder="New workspace"
            w="80%"
          />
          <Button type="submit">
            <IconPlus />
          </Button>
        </Group>
      </form>
      <Stack gap={24} style={{ overflowY: "auto" }} mah={800}>
        {workspaces.map((workspace, i) => (
          <Fragment key={workspace.name}>
            <Workspace
              connections={workspace.connections}
              name={workspace.name}
            />
            {i !== workspaces.length - 1 && <Divider />}
          </Fragment>
        ))}
      </Stack>
    </Stack>
  );
};
