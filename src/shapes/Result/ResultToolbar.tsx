import { createShapeId, useEditor } from "tldraw";
import { Button, Divider, Group, Text } from "@mantine/core";
import { useCreateChart } from "../../tools/useCreateChart";
import { ResultShape, ResultShapeUtil } from "./ResultShape";
import {
  IconChartBar,
  IconGitFork,
  IconMessageChatbot,
} from "@tabler/icons-react";
import { createArrowBetweenShapes } from "../../tools/createArrowBetweenShapes";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../state";
import "../../tldraw/context-toolbar/ContextToolbar.css";

export const ResultContextualToolbarComponent = () => {
  const editor = useEditor();
  const shape = editor.getOnlySelectedShape()!;
  const createChart = useCreateChart(shape);
  const schema = useAtomValue(schemaAtom);

  const props = shape.props as ReturnType<ResultShapeUtil["getDefaultProps"]>;

  const canChart =
    props.data.length > 0 &&
    props.data[0].find(
      ([key, value]) =>
        typeof value === "number" && key !== "id" && !key.endsWith("_id"),
    );

  const runCreateChart = () => {
    createChart();
  };

  const createBranch = () => {
    const selectedShape = editor.getOnlySelectedShape() as ResultShape;

    const outputShapeId = createShapeId(`${shape.id}-branch`);

    if (!selectedShape) {
      return;
    }

    const outputShape = editor.getShape(outputShapeId);
    if (outputShape) {
      editor.updateShape({
        ...outputShape,
        props: {
          query: selectedShape.props.query,
        },
      });
    } else {
      const bounds = editor.getSelectionPageBounds();

      if (!bounds) {
        return;
      }

      editor.createShape({
        id: outputShapeId,
        type: "query",
        x: bounds.left,
        y: bounds.top - 200,
        props: {
          query: selectedShape.props.query,
          width: 350,
          height: 300,
        },
      });

      createArrowBetweenShapes(editor, selectedShape.id, outputShapeId);
    }

    editor.select(outputShapeId);
    editor.zoomToSelection({ animation: { duration: 200 } });
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
          schema,
          result: props.data,
        },
      });
      createArrowBetweenShapes(editor, shape.id, askShapeId);
    }
    editor.select(askShapeId);
    editor.zoomToSelection({ animation: { duration: 200 } });
  };

  return (
    <Group>
      <Group py={0} h="100%">
        <Text size="xs">{props.data.length} Rows</Text>
      </Group>
      <Divider variant="solid" orientation="vertical" color="dark" />
      {canChart && (
        <Button
          variant="transparent"
          title="Graph"
          onClick={runCreateChart}
          disabled={!canChart}
        >
          <Group align="center" gap={4}>
            <IconChartBar size={16} />
            <Text size="xs">Chart</Text>
          </Group>
        </Button>
      )}

      <Button variant="transparent" onClick={createBranch}>
        <Group align="center" gap={4}>
          <IconGitFork size={16} />
          <Text size="xs">Fork</Text>
        </Group>
      </Button>

      <Button
        variant="transparent"
        title="Ask about this result"
        onClick={createAskShape}
      >
        <Group align="center" gap={4}>
          <IconMessageChatbot size={16} />
          <Text size="xs">Ask</Text>
        </Group>
      </Button>
    </Group>
  );
};
