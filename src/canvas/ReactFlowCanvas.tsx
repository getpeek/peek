import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { darkModeAtom } from "../state";
import { edgesAtom, nodesAtom, placeModeAtom, viewportAtom } from "./state";
import { CanvasApiPublisher } from "./CanvasApiPublisher";
import { AiPromptNode } from "./nodes/AiPrompt/AiPromptNode";
import { BarChartNode } from "./nodes/BarChart/BarChartNode";
import { ChatNode } from "./nodes/Chat/ChatNode";
import { QueryErrorNode } from "./nodes/QueryError/QueryErrorNode";
import { QueryNode } from "./nodes/Query/QueryNode";
import { ResultNode } from "./nodes/Result/ResultNode";
import { Toolbar } from "./ui/Toolbar";
import { ZoomIndicator } from "./ui/ZoomIndicator";
import { KeyboardShortcuts } from "./ui/KeyboardShortcuts";
import { defaultDimensions, makeNode } from "./defaults";
import { toCsv } from "../tools/export/csv";
import type { Message } from "../shapes/Ai/useExecutePrompt";
import type { AppEdge, AppNode, ChatNode as ChatNodeT, ResultNode as ResultNodeT } from "./types";
import { useCanvas } from "./useCanvas";
import "./nodes/node.css";

const nodeTypes = {
  query: QueryNode,
  result: ResultNode,
  "ai-prompt": AiPromptNode,
  chat: ChatNode,
  barchart: BarChartNode,
  "query-error": QueryErrorNode,
};

export function ReactFlowCanvas() {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner />
    </ReactFlowProvider>
  );
}

function ReactFlowCanvasInner() {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const initialViewport = useAtomValue(viewportAtom);
  const setViewport = useSetAtom(viewportAtom);
  const isDarkMode = useAtomValue(darkModeAtom);
  const [placeMode, setPlaceMode] = useAtom(placeModeAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      setNodes((ns) => applyNodeChanges(changes, ns));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<AppEdge>[]) => {
      setEdges((es) => applyEdgeChanges(changes, es));
    },
    [setEdges],
  );

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (!placeMode) return;
      const flowPos = rf.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      const dims = defaultDimensions[placeMode];
      const node = makeNode(placeMode, {
        x: flowPos.x - dims.w / 2,
        y: flowPos.y - dims.h / 2,
      });
      setNodes((ns) => [...ns, node]);
      if (placeMode === "query") {
        rf.setCenter(flowPos.x, flowPos.y, { zoom: 1, duration: 300 });
      }
      setPlaceMode(null);
    },
    [placeMode, rf, setNodes, setPlaceMode],
  );

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, dragged: AppNode) => {
      if (dragged.type !== "result") return;
      const result = canvas.getNode(dragged.id) as ResultNodeT | undefined;
      if (!result || result.type !== "result") return;

      const r = {
        x: result.position.x,
        y: result.position.y,
        w: result.width ?? defaultDimensions.result.w,
        h: result.height ?? defaultDimensions.result.h,
      };

      const chats = canvas.getNodes().filter((n): n is ChatNodeT => n.type === "chat");

      for (const chat of chats) {
        const c = {
          x: chat.position.x,
          y: chat.position.y,
          w: chat.width ?? defaultDimensions.chat.w,
          h: chat.height ?? defaultDimensions.chat.h,
        };
        const overlap = !(r.x + r.w < c.x || r.x > c.x + c.w || r.y + r.h < c.y || r.y > c.y + c.h);
        if (!overlap) continue;

        const csv = toCsv(result.data.data);
        const message: Message = {
          type: "context",
          message: `The user ran an additional query ${result.data.query} which resulted in this data:\n${csv}`,
          timestamp: Date.now(),
        };
        canvas.updateNodeData<ChatNodeT["data"]>(chat.id, (d) => ({
          ...d,
          messages: [...d.messages, message],
        }));
        return;
      }
    },
    [canvas],
  );

  return (
    <>
      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onMove={(_, vp) => setViewport(vp)}
        defaultViewport={initialViewport}
        colorMode={isDarkMode ? "dark" : "light"}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        onlyRenderVisibleElements
        selectionOnDrag
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        panActivationKeyCode="Space"
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={4}
        className={placeMode ? "place-mode-active" : undefined}
      >
        <Background
          variant={BackgroundVariant.Dots}
          bgColor="rgba(0, 0, 0, 0.7)"
          color="#333"
          gap={24}
          size={1.4}
        />
        <Toolbar />
        <ZoomIndicator />
      </ReactFlow>
      <CanvasApiPublisher />
      <KeyboardShortcuts />
    </>
  );
}
