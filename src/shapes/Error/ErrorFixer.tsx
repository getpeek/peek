import { useAtomValue } from "jotai";
import { useLayoutEffect, useRef, useState } from "react";
import { format } from "sql-formatter";
import { useEditor } from "tldraw";
import { schemaAtom } from "../../state";
import { useExecutePrompt } from "../Ai/useExecutePrompt";
import { QueryShape } from "../Query/QueryShape";
import { QueryErrorShape } from "./ErrorShape";
import { Stack, Text } from "@mantine/core";
import "./ErrorShape.css";

interface ErrorFixerProps {
  shape: QueryErrorShape;
}
export const ErrorFixer = ({ shape }: ErrorFixerProps) => {
  const runPrompt = useExecutePrompt("fast");
  const editor = useEditor();
  const schema = useAtomValue(schemaAtom);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  useLayoutEffect(() => {
    if (!suggestionRef.current) {
      return;
    }

    const height = suggestionRef.current.getBoundingClientRect().height;

    editor.updateShape<QueryErrorShape>({
      ...shape,
      props: { h: height + 250 },
    });
  }, [query]);

  const getResponse = async () => {
    setIsThinking(true);
    setQuery("");
    const response = await runPrompt([
      {
        type: "system",
        message: `/no_think You are an expert database administrator who has been tasked to fix an sql query which has resluted in an error.
You will be provided with an sql query which resulted in an error as well as the error.
You will output the correct sql that fixes the error and nothing else, no markdown, no backticks,
no comments or descriptions. Just the sql.

The database schema looks like this ${JSON.stringify(schema, null, 2)}. You can use this to correct incorrect spellings or do required joins etc.`,
        timestamp: Date.now(),
      },
      {
        type: "user",
        message: `This query: ${shape.props.query} resulted in this error message from the database ${shape.props.message}`,
        timestamp: Date.now() + 1000,
      },
    ]);

    for await (const chunk of response) {
      if (chunk.text !== "<think>" && chunk.text !== "</think>") {
        setQuery((old) => old + chunk.text);
      }
    }

    setIsThinking(false);

    setQuery((old) =>
      format(old, {
        language: "postgresql",
        keywordCase: "upper",
        functionCase: "upper",
      }),
    );
  };

  const acceptQuery = () => {
    editor.updateShape<QueryShape>({
      id: shape.props.queryShapeId,
      type: "query",
      props: {
        query,
      },
    });
    const bindings = editor.getBindingsInvolvingShape(shape);
    for (const binding of bindings) {
      editor.deleteShape(binding.fromId);
      editor.deleteShape(binding.toId);
    }
    editor.deleteBindings(bindings);
    editor.select(shape.props.queryShapeId);
    editor.zoomToSelectionIfOffscreen(undefined, {
      animation: { duration: 200 },
    });
  };

  return (
    <div className={`error-shape ${isThinking ? "loading" : ""}`}>
      <Stack gap="md">
        <Text size="sm">{shape.props.message}</Text>
        <button
          className="suggest-fix-button"
          onClick={getResponse}
          disabled={isThinking}
        >
          Suggest fix
        </button>
        {query.length > 0 && (
          <Stack>
            <div className="query-suggestion" ref={suggestionRef}>
              <pre>{query}</pre>
            </div>
            <button className="suggest-fix-button" onClick={acceptQuery}>
              Accept
            </button>
          </Stack>
        )}
      </Stack>
    </div>
  );
};
