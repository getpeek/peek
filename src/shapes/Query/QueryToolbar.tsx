import { track, useEditor } from "tldraw";
import { useExecuteQueries } from "../../tools/useExecuteQuery";
import { QueryShapeUtil } from "./QueryShape";
import { format } from "sql-formatter";
import { IconIndentIncrease, IconPlayerPlay } from "@tabler/icons-react";
import { Button, Divider, Group, Text } from "@mantine/core";

export const QueryContextualToolbarComponent = track(() => {
  const editor = useEditor();
  const executeQuery = useExecuteQueries();
  const shape = editor
    .getSelectedShapes()
    .find((shape) => shape.type === "query")!;

  const runExecuteQuery = async () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    executeQuery(shape, [query]);
  };

  const formatQuery = () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    const formatted = format(query, {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });

    editor.updateShape({
      id: shape.id,
      type: shape.type,
      props: {
        query: formatted,
      },
    });
  };

  return (
    <Group gap={0}>
      <Button variant="transparent" title="Format query" onClick={formatQuery}>
        <Group gap={8} align="center">
          <Text size="sm">Format</Text>
          <IconIndentIncrease size={14} color="var(--text-color)" />
        </Group>
      </Button>
      <Divider orientation="vertical" color="dark" />
      <Button variant="transparent" title="Run query" onClick={runExecuteQuery}>
        <Group gap={8} align="center">
          <Text size="sm">Run</Text>
          <IconPlayerPlay size={14} color="var(--text-color)" />
        </Group>
      </Button>
    </Group>
  );
});
