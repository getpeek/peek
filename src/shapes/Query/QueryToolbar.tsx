import {
  Box,
  TldrawUiButton,
  TldrawUiContextualToolbar,
  track,
  useEditor,
} from "tldraw";
import { useExecuteQueries } from "../../tools/useExecuteQuery";
import { QueryShapeUtil } from "./QueryShape";
import { format } from "sql-formatter";
import { IconIndentIncrease, IconPlayerPlay } from "@tabler/icons-react";
import { Divider, Group } from "@mantine/core";

export const QueryContextualToolbarComponent = track(() => {
  const editor = useEditor();
  const shape = editor
    .getSelectedShapes()
    .find((shape) => shape.type === "query")!;

  const executeQuery = useExecuteQueries();

  const getSelectionBounds = () => {
    const fullBounds = editor.getSelectionRotatedScreenBounds();
    if (!fullBounds) {
      return undefined;
    }
    return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0);
  };

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
    <TldrawUiContextualToolbar
      getSelectionBounds={getSelectionBounds}
      label="Sizes"
    >
      <TldrawUiButton title="Format query" type="normal" onClick={formatQuery}>
        <Group gap={8} align="center">
          <IconIndentIncrease size={16} />
          Format
        </Group>
      </TldrawUiButton>
      <Divider orientation="vertical" color="dark" />
      <TldrawUiButton
        title="Execute query"
        type="normal"
        onClick={runExecuteQuery}
      >
        <Group gap={8} align="center">
          <IconPlayerPlay size={16} /> Execute
        </Group>
      </TldrawUiButton>
    </TldrawUiContextualToolbar>
  );
});
