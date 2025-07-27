import {
  Box,
  createShapeId,
  TldrawUiButton,
  TldrawUiContextualToolbar,
  track,
  useEditor,
} from "tldraw";
import { AIPromptShapeUtil } from "../shapes/Ai/AiShape";
import { useExecutePrompt } from "../shapes/Ai/useExecutePrompt";
import { createArrowBetweenShapes } from "./createArrowBetweenShapes";

export const AiPromptContextualToolbarComponent = track(() => {
  const editor = useEditor();

  const runPrompt = useExecutePrompt();

  const getSelectionBounds = () => {
    const fullBounds = editor.getSelectionRotatedScreenBounds();
    if (!fullBounds) {
      return undefined;
    }
    return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0);
  };

  const runExecuteQuery = async () => {
    const shape = editor
      .getSelectedShapes()
      .find((shape) => shape.type === "ai-prompt")!;

    const prompt = (
      shape.props as ReturnType<AIPromptShapeUtil["getDefaultProps"]>
    ).prompt;

    if (prompt.length === 0) {
      return;
    }

    try {
      editor.updateShape({
        id: shape.id,
        type: "ai-shape",
        props: { isLoading: true },
      });
      const stream = await runPrompt(prompt);

      let query = "";
      let reason = "";
      let is_query = false;

      for await (const chunk of stream) {
        if (is_query) {
          query += chunk.text;
        } else {
          reason += chunk.text;
        }
        if (chunk.text.includes("</think>")) {
          is_query = true;
        }
        editor.updateShape({
          ...shape,
          props: {
            reason,
          },
        });
      }

      const outputShapeId = createShapeId(`${shape.id}-result`);
      const outputShape = editor.getShape(outputShapeId);
      const x = (editor.getSelectionPageBounds()?.right ?? shape.x) + 50;

      if (outputShape) {
        editor.updateShape({
          id: outputShapeId,
          type: "query",
          props: {
            query,
          },
        });
      } else {
        editor.createShape({
          id: outputShapeId,
          type: "query",
          x: x + 50,
          y: shape.y,
          props: {
            query,
            w: 400,
            h: 300,
          },
        });
        createArrowBetweenShapes(editor, shape.id, outputShapeId);
        editor.updateShape({
          id: shape.id,
          type: "ai-shape",
          props: { isLoading: false },
        });
      }
    } catch (e) {
      editor.updateShape({
        id: shape.id,
        type: "ai-shape",
        props: { isLoading: true },
      });
      console.error(e);
    }
  };

  return (
    <TldrawUiContextualToolbar
      getSelectionBounds={getSelectionBounds}
      label="Sizes"
    >
      <TldrawUiButton title="Prompt" type="normal" onClick={runExecuteQuery}>
        Generate query
      </TldrawUiButton>
    </TldrawUiContextualToolbar>
  );
});
