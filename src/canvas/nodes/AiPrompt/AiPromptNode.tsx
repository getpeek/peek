import { NodeProps, NodeResizer } from "@xyflow/react";
import { IconPlayerPlay, IconSparkles } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { format } from "sql-formatter";
import { useExecutePrompt } from "../../../shapes/Ai/useExecutePrompt";
import { configAtom, schemaAtom } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { ids } from "../../ids";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { registerEditorFocus } from "../editorFocusRegistry";
import type { AiPromptNode as AiPromptNodeT, QueryNode } from "../../types";
import "./AiPrompt.css";

const DEFAULT_W = 350;
const DEFAULT_H = 240;

function firstLine(text: string): string {
  const line = text.split("\n").find(l => l.trim().length > 0);
  return line ? line.trim().slice(0, 60) : "";
}

export function AiPromptNode({ id, data, selected, width, height }: NodeProps<AiPromptNodeT>) {
  const canvas = useCanvas();
  const schema = useAtomValue(schemaAtom);
  const config = useAtomValue(configAtom);
  const runPrompt = useExecutePrompt("fast");
  const modelName = config?.ai.model ?? "model";

  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useScrollFallthrough(bodyRef);

  useEffect(() => registerEditorFocus(id, () => textareaRef.current?.focus()), [id]);

  const generate = async () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "ai-prompt") {
      return;
    }
    const prompt = (node.data as AiPromptNodeT["data"]).prompt;
    if (prompt.length === 0) {
      return;
    }

    canvas.updateNodeData<AiPromptNodeT["data"]>(id, {
      isLoading: true,
      reason: "",
    });

    try {
      const stream = await runPrompt([
        {
          type: "system",
          message: `/no_think you are an expert database administrator. You are tasked with writing Postgres SQL queries based on user requests.
Here is the database schema. It contains all tables and their columns as well as a list of references between foreign keys for different tables.
${JSON.stringify(schema)}.

Respond ONLY with the sql in text format, no backticks, markdown, formatting, comments or anything else. Just the sql query as plain text.`,
          timestamp: Date.now(),
        },
        { type: "user", message: prompt, timestamp: Date.now() },
      ]);

      let query = "";
      let reason = "";
      let isQuery = false;
      let isFirstToken = true;

      const outputId = ids.result(id);
      const existingOutput = canvas.getNode(outputId);

      if (!existingOutput) {
        const newQueryNode: QueryNode = {
          id: outputId,
          type: "query",
          position: {
            x: node.position.x + (node.width ?? DEFAULT_W) + 50,
            y: node.position.y,
          },
          width: 420,
          height: 320,
          data: { query: "" },
        };
        canvas.addNode(newQueryNode);
        canvas.connect(id, outputId);
        canvas.selectOnly(outputId);
        canvas.zoomToNode(outputId, { duration: 300 });
      }

      for await (const chunk of stream) {
        if (isFirstToken) {
          if (chunk.text !== "<think>") {
            isQuery = true;
          }
          isFirstToken = false;
        }
        if (isQuery) {
          query += chunk.text;
        } else {
          reason += chunk.text;
        }
        if (chunk.text.includes("</think>")) {
          isQuery = true;
        }

        canvas.updateNodeData<AiPromptNodeT["data"]>(id, { reason });
        canvas.updateNodeData<QueryNode["data"]>(outputId, { query });
      }

      try {
        const formatted = format(query, {
          language: "postgresql",
          functionCase: "upper",
          keywordCase: "upper",
        });
        canvas.updateNodeData<QueryNode["data"]>(outputId, {
          query: formatted,
        });
      } catch {
        // unformatted is fine
      }
    } catch (e) {
      console.error("AI prompt failed:", e);
    } finally {
      canvas.updateNodeData<AiPromptNodeT["data"]>(id, { isLoading: false });
    }
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={300} minHeight={180} />
      <HiddenHandles />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader
          nodeId={id}
          name={firstLine(data.prompt) || "new prompt"}
          indicator={<NodeIndicator kind='ai-prompt' />}
        />
        <div className='ai-prompt-body nodrag' ref={bodyRef}>
          {data.isLoading && <div className='running-shimmer' />}
          <textarea
            ref={textareaRef}
            value={data.prompt}
            placeholder='Generate a query that...'
            autoComplete='off'
            autoCorrect='off'
            disabled={data.isLoading}
            onChange={e =>
              canvas.updateNodeData<AiPromptNodeT["data"]>(id, {
                prompt: e.currentTarget.value,
              })
            }
          />
          {data.reason && (
            <div className='ai-status'>
              <IconSparkles size={11} />
              {data.reason}
            </div>
          )}
        </div>
        <div className='app-node-footer nodrag'>
          <span className='ai-status'>
            <IconSparkles size={11} />
            {modelName}
          </span>
          <button
            className='btn'
            onClick={generate}
            disabled={data.isLoading || data.prompt.length === 0}
          >
            <IconPlayerPlay size={13} />
            Generate query
            <span className='kbd'>⌘↵</span>
          </button>
        </div>
      </div>
    </>
  );
}
