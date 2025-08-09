import { useForm } from "@mantine/form";
import { ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { workspacesAtom } from "./state";
import "./ConnectionForm.css";

interface ConnectionFormProps {
  workspaceName: string;
}

interface ConnectionFormFields {
  color: string;
  name: string;
  url: string;
}

export const ConnectionForm = ({ workspaceName }: ConnectionFormProps) => {
  const [, setWorkspaces] = useAtom(workspacesAtom);
  const colors = ["#5584E8", "#CEEF49", "#EF7549", "#2ED061"];

  const form = useForm<ConnectionFormFields>({
    mode: "uncontrolled",
    initialValues: {
      color: "#fea3ad",
      name: "",
      url: "",
    },
  });

  const createConnection = (values: ConnectionFormFields) => {
    if (values.name.length === 0 || values.url.length === 0) {
      return;
    }

    setWorkspaces((workspaces) =>
      workspaces.map((workspace) => {
        if (workspace.name === workspaceName) {
          return {
            ...workspace,
            connections: [...workspace.connections, values],
          };
        }
        return workspace;
      }),
    );
    form.reset();
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => createConnection(values))}
      className="form"
    >
      <div
        className="color"
        style={{ backgroundColor: form.values.color }}
        onClick={() => {
          const currentColor =
            colors.findIndex((color) => color === form.values.color) ?? 0;
          const nextColor = colors[(currentColor + 1) % colors.length];
          form.setFieldValue("color", nextColor);
        }}
      />
      <input
        type="text"
        name="name"
        autoCorrect="off"
        autoComplete="off"
        key={form.key("name")}
        className="input"
        placeholder="Name"
        style={{ width: 80, fontWeight: "bold" }}
        {...form.getInputProps("name")}
      />
      <input
        type="text"
        name="url"
        autoCorrect="off"
        autoComplete="off"
        key={form.key("url")}
        placeholder="postgres://user:pass@localhost/db"
        className="input"
        {...form.getInputProps("url")}
      />
      {form.values.name.length > 0 && form.values.url.length > 0 && (
        <ActionIcon variant="transparent" c="dark" type="submit">
          <IconPlus />
        </ActionIcon>
      )}
    </form>
  );
};
