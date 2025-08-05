import { track, useEditor } from "tldraw";
import { useExecuteQueries } from "../../tools/useExecuteQuery";
import { QueryShapeUtil } from "./QueryShape";
import { format } from "sql-formatter";
import { IconIndentIncrease, IconPlayerPlay } from "@tabler/icons-react";
import { Button, Divider, Group } from "@mantine/core";

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
          <IconIndentIncrease size={16} />
          Format
        </Group>
      </Button>
      <Divider orientation="vertical" color="dark" />
      <Button
        variant="transparent"
        title="Execute query"
        onClick={runExecuteQuery}
      >
        <Group gap={8} align="center">
          <IconPlayerPlay size={16} /> Execute
        </Group>
      </Button>
    </Group>
  );
});
