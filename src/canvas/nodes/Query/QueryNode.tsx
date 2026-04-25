import { NodeProps, NodeResizer } from "@xyflow/react";
import { IconIndentIncrease, IconPlayerPlay } from "@tabler/icons-react";
import { format } from "sql-formatter";
import { useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { SqlEditor } from "../../../shapes/Query/Editor/SqlEditor";
import { useCanvas } from "../../useCanvas";
import { useExecuteQueries } from "../../useExecuteQueries";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import type { QueryNode as QueryNodeT } from "../../types";
import { registerQueryEditorFocus } from "./editorFocusRegistry";
import "../node.css";

const DEFAULT_W = 420;
const DEFAULT_H = 320;

function firstLine(query: string): string {
  const line = query.split("\n").find((l) => l.trim().length > 0);
  if (!line) return "";
  return line.replace(/^--\s*/, "").trim().slice(0, 60);
}

export function QueryNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<QueryNodeT>) {
  const canvas = useCanvas();
  const executeQueries = useExecuteQueries();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  useEffect(
    () => registerQueryEditorFocus(id, () => editorRef.current?.focus()),
    [id],
  );

  const runQuery = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "query") return;
    executeQueries(node, [(node.data as QueryNodeT["data"]).query]);
  };

  const formatQuery = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "query") return;
    const current = (node.data as QueryNodeT["data"]).query;
    try {
      const formatted = format(current, {
        keywordCase: "upper",
        functionCase: "upper",
        language: "postgresql",
      });
      canvas.updateNodeData<QueryNodeT["data"]>(id, { query: formatted });
    } catch {
      // ignore format errors
    }
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={320} minHeight={200} />
      <HiddenHandles />
      <div
        className={`app-node ${selected ? "selected" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader
          nodeId={id}
          type="query"
          name={firstLine(data.query) || "untitled.sql"}
        />
        <div className="app-node-body nodrag" ref={bodyRef}>
          <SqlEditor
            query={data.query}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                runQuery,
              );
            }}
            onQueryChange={(query) =>
              canvas.updateNodeData<QueryNodeT["data"]>(id, { query })
            }
          />
        </div>
        <div className="app-node-footer nodrag">
          <button
            className="btn btn-ghost"
            onClick={formatQuery}
            title="Format query (⌘⇧I)"
          >
            <IconIndentIncrease size={13} />
            Format
          </button>
          <button
            className="btn"
            onClick={runQuery}
            title="Run query (⌘↵)"
          >
            <IconPlayerPlay size={13} />
            Run
            <span className="kbd">⌘↵</span>
          </button>
        </div>
      </div>
    </>
  );
}
