import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ReactFlowCanvas.css";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { edgesAtom, nodesAtom, placeModeAtom, viewportAtom } from "./state";
import { CanvasApiPublisher } from "./CanvasApiPublisher";
import { AiPromptNode } from "./nodes/AiPrompt/AiPromptNode";
import { BarChartNode } from "./nodes/BarChart/BarChartNode";
import { ChatNode } from "./nodes/Chat/ChatNode";
import { DrawNode, getSvgPathFromStroke } from "./nodes/Draw/DrawNode";
import { QueryErrorNode } from "./nodes/QueryError/QueryErrorNode";
import { QueryNode } from "./nodes/Query/QueryNode";
import { ResultNode } from "./nodes/Result/ResultNode";
import { TableDefinitionNode } from "./nodes/TableDefinition/TableDefinitionNode";
import { TextNode } from "./nodes/Text/TextNode";
import { VariableNode } from "./nodes/Variable/VariableNode";
import { Toolbar } from "./ui/Toolbar";
import { ZoomIndicator } from "./ui/ZoomIndicator";
import { RemoteCursorsLayer } from "../multiplayer/RemoteCursorsLayer";
import { useCursorBroadcast } from "../multiplayer/useCursorBroadcast";
import type { AppEdge, AppNode } from "./types";
import { useCanvas } from "./hooks/useCanvas";
import { useDrawTool } from "./hooks/useDrawTool";
import { usePlaceTool } from "./hooks/usePlaceTool";
import { useRubberBandSelect } from "./hooks/useRubberBandSelect";
import { useSchemaForceLayout } from "./hooks/useSchemaForceLayout";
import { useSelectionHighlight } from "./hooks/useSelectionHighlight";
import { LassoOverlay } from "./LassoOverlay";
import { useVariableDragHighlight } from "./hooks/useVariableDragHighlight";
import { getStroke } from "perfect-freehand";
import { FloatingEdge } from "./edges/FloatingEdge";
import "./nodes/node.css";
import { PeekKeyboardShortcuts } from "./ui/KeyboardShortcuts";

const nodeTypes = {
  query: QueryNode,
  result: ResultNode,
  "ai-prompt": AiPromptNode,
  chat: ChatNode,
  barchart: BarChartNode,
  "query-error": QueryErrorNode,
  "table-definition": TableDefinitionNode,
  text: TextNode,
  variable: VariableNode,
  draw: DrawNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

const defaultEdgeOptions = {
  type: "floating",
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
  const placeMode = useAtomValue(placeModeAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const { livePoints, strokeWidth: drawStrokeWidth, color: drawColor } = useDrawTool();
  usePlaceTool();
  const { rect: selectionRect } = useRubberBandSelect();
  useCursorBroadcast();
  const { onSchemaNodeDragStart, onSchemaNodeDrag, onSchemaNodeDragStop } = useSchemaForceLayout();

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      setNodes(ns => applyNodeChanges(changes, ns));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<AppEdge>[]) => {
      setEdges(es => applyEdgeChanges(changes, es));
    },
    [setEdges],
  );

  const isValidConnection = useCallback<IsValidConnection<AppEdge>>(
    connection => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return false;
      }
      const source = rf.getNode(connection.source);
      const target = rf.getNode(connection.target);
      if (!source || !target) {
        return false;
      }
      if (source.type === "variable" && (target.type === "query" || target.type === "result")) {
        return true;
      }
      if (source.type === "result" && target.type === "chat") {
        return true;
      }
      return false;
    },
    [rf],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || !isValidConnection(c)) {
        return;
      }
      canvas.connect(c.source, c.target);
    },
    [canvas, isValidConnection],
  );

  const variableDragHighlight = useVariableDragHighlight();

  const { styledNodes, styledEdges } = useSelectionHighlight(nodes, edges);

  const onNodeDragStart = useCallback(
    (_e: unknown, n: AppNode) => onSchemaNodeDragStart(n),
    [onSchemaNodeDragStart],
  );
  const onNodeDrag = useCallback(
    (_e: unknown, n: AppNode) => onSchemaNodeDrag(n),
    [onSchemaNodeDrag],
  );
  const onNodeDragStop = useCallback(
    (_e: unknown, n: AppNode) => onSchemaNodeDragStop(n),
    [onSchemaNodeDragStop],
  );

  return (
    <>
      <ReactFlow<AppNode, AppEdge>
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={variableDragHighlight.onConnectStart}
        onConnectEnd={variableDragHighlight.onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={(_, vp) => setViewport(vp)}
        defaultViewport={initialViewport}
        colorMode={"dark"}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode='Shift'
        onlyRenderVisibleElements
        selectionOnDrag={false}
        nodesDraggable={placeMode === null}
        elementsSelectable={placeMode === null}
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        panActivationKeyCode='Space'
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={4}
        className={
          [
            placeMode === "draw"
              ? "place-mode-active draw-mode-active"
              : placeMode
                ? "place-mode-active"
                : "",
            variableDragHighlight.active ? "connecting-from-variable" : "",
            variableDragHighlight.connecting ? "connecting" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        <Background
          variant={BackgroundVariant.Dots}
          bgColor='transparent'
          color='rgba(255, 255, 255, 0.18)'
          gap={28}
          size={1}
        />
        <Toolbar />
        <ZoomIndicator />
        <RemoteCursorsLayer />
      </ReactFlow>
      {livePoints.length > 1 && (
        <svg
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <path
            d={getSvgPathFromStroke(
              getStroke(livePoints, {
                size: drawStrokeWidth * 4 * rf.getViewport().zoom,
                thinning: 0.5,
                smoothing: 0.5,
                streamline: 0.5,
              }),
            )}
            fill={drawColor}
          />
        </svg>
      )}
      {selectionRect && (
        <div
          style={{
            position: "fixed",
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.w,
            height: selectionRect.h,
            pointerEvents: "none",
            zIndex: 1000,
            border: "1px dashed var(--pk-accent)",
            background: "var(--pk-accent-bg)",
            borderRadius: 4,
          }}
        />
      )}
      <LassoOverlay />
      <CanvasApiPublisher />
      <PeekKeyboardShortcuts />
    </>
  );
}
