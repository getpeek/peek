import { NodeProps, NodeResizer } from "@xyflow/react";
import { Stack, Text } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";
import { format } from "sql-formatter";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../../state";
import { useExecutePrompt } from "../../../shapes/Ai/useExecutePrompt";
import { useCanvas } from "../../useCanvas";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import type { QueryErrorNode as QueryErrorNodeT, QueryNode } from "../../types";
import "../../../shapes/Error/ErrorShape.css";

const DEFAULT_W = 400;
const DEFAULT_H = 300;

export function QueryErrorNode({ id, data, selected, width, height }: NodeProps<QueryErrorNodeT>) {
  const canvas = useCanvas();
  const runPrompt = useExecutePrompt("fast");
  const schema = useAtomValue(schemaAtom);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  useLayoutEffect(() => {
    if (!suggestionRef.current) {
      return;
    }
    const measured = suggestionRef.current.getBoundingClientRect().height;
    canvas.updateNode(id, n =>
      n.height === measured + 250 ? n : { ...n, height: measured + 250 },
    );
  }, [query, canvas, id]);

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
        message: `This query: ${data.query} resulted in this error message from the database ${data.message}`,
        timestamp: Date.now() + 1000,
      },
    ]);

    for await (const chunk of response) {
      if (chunk.text !== "<think>" && chunk.text !== "</think>") {
        setQuery(old => old + chunk.text);
      }
    }

    setIsThinking(false);
    setQuery(old => {
      try {
        return format(old, {
          language: "postgresql",
          keywordCase: "upper",
          functionCase: "upper",
        });
      } catch {
        return old;
      }
    });
  };

  const acceptQuery = () => {
    canvas.updateNodeData<QueryNode["data"]>(data.queryNodeId, { query });
    canvas.deleteNode(id);
    canvas.selectOnly(data.queryNodeId);
    canvas.zoomToNode(data.queryNodeId, { duration: 200 });
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={300} minHeight={200} />
      <HiddenHandles />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader nodeId={id} type='query-error' name='query failed' />
        <div className='app-node-body nodrag' ref={bodyRef}>
          <div className={`error-shape ${isThinking ? "loading" : ""}`}>
            <Stack gap='md'>
              <Text size='sm'>{data.message}</Text>
              <button className='suggest-fix-button' onClick={getResponse} disabled={isThinking}>
                Suggest fix
              </button>
              {query.length > 0 && (
                <Stack>
                  <div className='query-suggestion' ref={suggestionRef}>
                    <pre>{query}</pre>
                  </div>
                  <button className='suggest-fix-button' onClick={acceptQuery}>
                    Accept
                  </button>
                </Stack>
              )}
            </Stack>
          </div>
        </div>
      </div>
    </>
  );
}
