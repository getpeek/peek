import { Button, Group, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";

export const AddWorkspaceForm = ({
  onCreate,
}: {
  onCreate: (name: string) => void;
}) => {
  const form = useForm<{ name: string }>({
    initialValues: {
      name: "",
    },
    validate: {
      name: (value) =>
        value.length < 2 ? "Name must have at least 2 characters" : null,
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => onCreate(values.name))}>
      <Group wrap="nowrap">
        <input
          {...form.getInputProps("name")}
          autoFocus
          type="text"
          autoCorrect="off"
          autoComplete="off"
          name="workspace-name"
          className="add-workspace-input"
          placeholder="My workspace"
        />
        <Button variant="light" radius="lg" type="submit">
          <Group align="center">
            <Text>Add</Text> <IconPlus size={20} />
          </Group>
        </Button>
      </Group>
    </form>
  );
};
