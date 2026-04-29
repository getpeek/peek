import { NodeProps, NodeResizer } from "@xyflow/react";
import { IconIndentIncrease, IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import type { editor as MonacoEditor } from "monaco-editor";
import { SqlEditor } from "../../../shapes/Query/Editor/SqlEditor";
import { useCanvas } from "../../useCanvas";
import { useExecuteQueries } from "../../useExecuteQueries";
import { useGetVariables } from "../../useGetVariables";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { sessionStateAtom } from "../../../multiplayer/state";
import { formatPreservingVars } from "../../variables";
import type { QueryNode as QueryNodeT } from "../../types";
import { registerQueryEditorFocus } from "./editorFocusRegistry";
import "./Query.css";

const DEFAULT_W = 420;
const DEFAULT_H = 320;
const LIVE_POLL_MS = 10_000;

function firstLine(query: string): string {
  const line = query.split("\n").find(l => l.trim().length > 0);
  if (!line) {
    return "";
  }
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
  const session = useAtomValue(sessionStateAtom);
  const variables = useGetVariables(id);
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const isRunning = data.isRunning ?? false;

  useEffect(() => registerQueryEditorFocus(id, () => editorRef.current?.focus()), [id]);

  const runQuery = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "query") {
      return;
    }
    if ((node.data as QueryNodeT["data"]).isRunning) {
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
    if (interval === null || interval === undefined) {
      return;
    }
    // Only the host runs the query executor in a session; joiners observe
    // streamed results.
    if (session?.role === "joiner") {
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
      const queryData = node.data as QueryNodeT["data"];
      if (queryData.isRunning) {
        return;
      }
      if (!isSelectOnly(queryData.query)) {
        return;
      }
      executeQueries(node, [queryData.query]);
    };
    tick();
    const handle = window.setInterval(tick, interval);
    return () => window.clearInterval(handle);
  }, [id, data.liveIntervalMs, canvas, executeQueries, session]);

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
          name={firstLine(data.query) || "untitled.sql"}
          indicator={<NodeIndicator kind='query' />}
        >
          <button
            className={`header-icon-btn ${isLive ? "is-live" : ""}`}
            onClick={e => {
              e.stopPropagation();
              toggleLive();
            }}
            title={isLive ? "Stop live polling" : "Poll every 10s"}
          >
            <span className='live-dot' />
          </button>
        </NodeHeader>
        <div className='app-node-body nodrag' ref={bodyRef}>
          <SqlEditor
            query={data.query}
            variables={Object.keys(variables)}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              editor.onDidFocusEditorWidget(() => {
                editorFocusedRef.current = true;
              });
              editor.onDidBlurEditorWidget(() => {
                editorFocusedRef.current = false;
              });
              editor.onKeyDown(e => {
                const isMod = e.metaKey || e.ctrlKey;
                if (isMod && e.keyCode === monaco.KeyCode.Enter) {
                  e.preventDefault();
                  e.stopPropagation();
                  runQuery();
                }
              });
            }}
            onQueryChange={query => canvas.updateNodeData<QueryNodeT["data"]>(id, { query })}
          />
        </div>
        <div className='app-node-footer nodrag'>
          <button className='btn btn-ghost' onClick={formatQuery} title='Format query (⌘⇧I)'>
            <IconIndentIncrease size={13} />
            Format
          </button>
          <button className='btn' onClick={runQuery} disabled={isRunning} title='Run query (⌘↵)'>
            {isRunning ? (
              <IconLoader2 size={13} className='btn-spinner' />
            ) : (
              <IconPlayerPlay size={13} />
            )}
            {isRunning ? "Running…" : "Run"}
            <span className='kbd'>⌘↵</span>
          </button>
        </div>
      </div>
    </>
  );
}
