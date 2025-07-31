import {
  Box,
  createShapeId,
  TldrawUiButton,
  TldrawUiContextualToolbar,
  useEditor,
} from "tldraw";
import { Divider, Group, Text } from "@mantine/core";
import { Parser } from "node-sql-parser";
import { useCreateChart } from "../../tools/useCreateChart";
import { ResultShapeUtil } from "./ResultShape";
import { IconChartBar, IconMessageChatbot } from "@tabler/icons-react";
import { createArrowBetweenShapes } from "../../tools/createArrowBetweenShapes";

export const ResultContextualToolbarComponent = () => {
  const editor = useEditor();
  const shape = editor.getOnlySelectedShape()!;
  const createChart = useCreateChart(shape);

  const props = shape.props as ReturnType<ResultShapeUtil["getDefaultProps"]>;

  const canChart =
    props.data.length > 0 &&
    props.data[0].find(
      ([key, value]) =>
        typeof value === "number" && key !== "id" && !key.endsWith("_id"),
    );

  let tables: (string | undefined)[] = [];
  try {
    tables = new Parser()
      .tableList(props.query)
      .map((table) => table.split("::").pop());
  } catch {}

  const getSelectionBounds = () => {
    const fullBounds = editor.getSelectionRotatedScreenBounds();
    if (!fullBounds) {
      return undefined;
    }
    return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0);
  };

  const runCreateChart = () => {
    createChart();
  };

  const createAskShape = () => {
    const askShapeId = createShapeId(`${shape.id}-chat`);
    const outputShape = editor.getShape(askShapeId);

    const selectedShape = editor.getOnlySelectedShape();

    if (!selectedShape) {
      return;
    }

    const x = (editor.getSelectionPageBounds()?.right ?? shape.x) + 50;

    if (!outputShape) {
      editor.createShape({
        id: askShapeId,
        type: "chat",
        x,
        y: shape.y,
        props: {
          query: props.query,
          result: props.data,
        },
      });
      createArrowBetweenShapes(editor, shape.id, askShapeId);
    }
    editor.select(askShapeId);
    editor.zoomToSelection({ animation: { duration: 200 } });
  };

  return (
    <TldrawUiContextualToolbar
      getSelectionBounds={getSelectionBounds}
      label="Actions"
    >
      <Group>
        <Group pl="lg" py={0} h="100%">
          {tables.map((table) => (
            <Text key={table} size="xs">
              {table}
            </Text>
          ))}
        </Group>
        <Divider variant="solid" orientation="vertical" color="dark" />
        <Group py={0} h="100%">
          <Text size="xs">{props.data.length} Rows</Text>
        </Group>
        <Divider variant="solid" orientation="vertical" color="dark" />
        <TldrawUiButton
          title="Graph"
          type="normal"
          onClick={runCreateChart}
          disabled={!canChart}
        >
          <Group align="center" gap={4}>
            <IconChartBar size={16} />
            <Text size="xs">Chart</Text>
          </Group>
        </TldrawUiButton>
        <Divider variant="solid" orientation="vertical" color="dark" />
        <TldrawUiButton
          title="Ask about this result"
          type="normal"
          onClick={createAskShape}
        >
          <Group align="center" gap={4}>
            <IconMessageChatbot size={16} />
            <Text size="xs">Ask</Text>
          </Group>
        </TldrawUiButton>
      </Group>
    </TldrawUiContextualToolbar>
  );
};
