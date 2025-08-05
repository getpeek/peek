import { createShapeId, track, useEditor } from "tldraw";
import { AIPromptShapeUtil } from "./AiShape";
import { useExecutePrompt } from "./useExecutePrompt";
import { createArrowBetweenShapes } from "../../tools/createArrowBetweenShapes";
import { format } from "sql-formatter";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../state";
import { Button, Group } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";

export const AiPromptContextualToolbarComponent = track(() => {
  const editor = useEditor();
  const schema = useAtomValue(schemaAtom);

  const runPrompt = useExecutePrompt("fast");

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
      const stream = await runPrompt([
        {
          type: "system",
          message: `you are an expert database administrator. You are tasked with writing Postgres SQL queries based on user requests.
      Here is the database schema. It contains all tables and their columns as well as a list of references between foreign keys for different tables.
      ${JSON.stringify(schema)}.

      Respond ONLY with the sql in text format, no backticks, markdown, formatting, comments or anything else. Just the sql query as plain text.`,
          timestamp: Date.now(),
        },
        {
          type: "user",
          message: prompt,
          timestamp: Date.now(),
        },
      ]);

      let query = "";
      let reason = "";
      let is_query = false;

      let is_first_token = true;

      const outputShapeId = createShapeId(`${shape.id}-result`);
      const outputShape = editor.getShape(outputShapeId);

      for await (const chunk of stream) {
        if (is_first_token) {
          if (chunk.text !== "<think>") {
            is_query = true;
          }
          is_first_token = false;
        }
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
            isLoading: false,
            reason,
          },
        });

        if (outputShape) {
          editor.updateShape({
            id: outputShapeId,
            type: "query",
            props: {
              query,
            },
          });
        } else {
          const bounds = editor.getShapePageBounds(shape);
          if (!bounds) {
            return;
          }

          editor.createShape({
            id: outputShapeId,
            type: "query",
            x: bounds.right + 50,
            y: bounds.top,
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
      }

      const formatted = format(query, {
        language: "postgresql",
        functionCase: "upper",
        keywordCase: "upper",
      });

      const out = editor.getShape(outputShapeId);

      if (out) {
        editor.updateShape({
          ...out,
          props: { query: formatted },
        });
      }
    } catch {}
  };

  return (
    <Group>
      <Button title="Prompt" variant="transparent" onClick={runExecuteQuery}>
        Generate <IconPlayerPlay size={20} />
      </Button>
    </Group>
  );
});
