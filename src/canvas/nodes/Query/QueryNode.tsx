import { NodeProps, NodeResizer } from "@xyflow/react";
import { IconIndentIncrease, IconPlayerPlay } from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";
import { useAtomValue } from "jotai";
import type { editor as MonacoEditor } from "monaco-editor";
import { SqlEditor } from "../../../shapes/Query/Editor/SqlEditor";
import { useCanvas } from "../../useCanvas";
import { useExecuteQueries } from "../../useExecuteQueries";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { edgesAtom, nodesAtom } from "../../state";
import { formatPreservingVars } from "../../variables";
import type {
  QueryNode as QueryNodeT,
  VariableData,
  VariableNode as VariableNodeT,
} from "../../types";
import { registerQueryEditorFocus } from "./editorFocusRegistry";
import "../node.css";

const DEFAULT_W = 420;
const DEFAULT_H = 320;
const LIVE_POLL_MS = 10_000;

function firstLine(query: string): string {
  const line = query.split("\n").find((l) => l.trim().length > 0);
  if (!line) return "";
  return line
    .replace(/^--\s*/, "")
    .trim()
    .slice(0, 60);
}

function isSelectOnly(query: string): boolean {
  return query.trim().toLowerCase().startsWith("select");
}

export function QueryNode({ id, data, selected, width, height }: NodeProps<QueryNodeT>) {
  const canvas = useCanvas();
  const executeQueries = useExecuteQueries();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const editorFocusedRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);
  const allNodes = useAtomValue(nodesAtom);
  const allEdges = useAtomValue(edgesAtom);
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  const variableNames = useMemo(() => {
    const incoming = allEdges
      .filter((e) => e.target === id)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    const merged: Record<string, true> = {};
    for (const edge of incoming) {
      const source = allNodes.find(
        (n): n is VariableNodeT => n.id === edge.source && n.type === "variable",
      );
      if (!source) {
        continue;
      }
      for (const row of (source.data as VariableData).rows) {
        if (row.name) {
          merged[row.name] = true;
        }
      }
    }
    return Object.keys(merged);
  }, [id, allNodes, allEdges]);

  useEffect(() => registerQueryEditorFocus(id, () => editorRef.current?.focus()), [id]);

  const runQuery = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "query") {
      return;
    }
    executeQueries(node, [(node.data as QueryNodeT["data"]).query]);
  };

  const isLive = (data.liveIntervalMs ?? null) !== null;

  const toggleLive = () => {
    canvas.updateNodeData<QueryNodeT["data"]>(id, {
      liveIntervalMs: isLive ? null : LIVE_POLL_MS,
    });
  };

  useEffect(() => {
    const interval = data.liveIntervalMs;
    if (interval == null) {
      return;
    }
    const tick = () => {
      if (editorFocusedRef.current) {
        return;
      }
      const node = canvas.getNode(id);
      if (!node || node.type !== "query") {
        return;
      }
      const query = (node.data as QueryNodeT["data"]).query;
      if (!isSelectOnly(query)) {
        return;
      }
      executeQueries(node, [query]);
    };
    tick();
    const handle = window.setInterval(tick, interval);
    return () => window.clearInterval(handle);
  }, [id, data.liveIntervalMs, canvas, executeQueries]);

  const formatQuery = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "query") {
      return;
    }
    const current = (node.data as QueryNodeT["data"]).query;
    try {
      const formatted = formatPreservingVars(current, {
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
      <HiddenHandles connectableTarget />
      <div
        className={`app-node ${selected ? "selected" : ""} ${isLive ? "is-live" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader
          nodeId={id}
          type="query"
          name={firstLine(data.query) || "untitled.sql"}
          isLive={isLive}
          onLiveToggle={toggleLive}
        />
        <div className="app-node-body nodrag" ref={bodyRef}>
          <SqlEditor
            query={data.query}
            variables={variableNames}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              editor.onDidFocusEditorWidget(() => {
                editorFocusedRef.current = true;
              });
              editor.onDidBlurEditorWidget(() => {
                editorFocusedRef.current = false;
              });
              editor.onKeyDown((e) => {
                const isMod = e.metaKey || e.ctrlKey;
                if (isMod && e.keyCode === monaco.KeyCode.Enter) {
                  e.preventDefault();
                  e.stopPropagation();
                  runQuery();
                }
              });
            }}
            onQueryChange={(query) => canvas.updateNodeData<QueryNodeT["data"]>(id, { query })}
          />
        </div>
        <div className="app-node-footer nodrag">
          <button className="btn btn-ghost" onClick={formatQuery} title="Format query (⌘⇧I)">
            <IconIndentIncrease size={13} />
            Format
          </button>
          <button className="btn" onClick={runQuery} title="Run query (⌘↵)">
            <IconPlayerPlay size={13} />
            Run
            <span className="kbd">⌘↵</span>
          </button>
        </div>
      </div>
    </>
  );
}
