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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
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
import { KeyboardShortcuts } from "./ui/KeyboardShortcuts";
import { RemoteCursorsLayer } from "../multiplayer/RemoteCursorsLayer";
import { useCursorBroadcast } from "../multiplayer/useCursorBroadcast";
import { defaultDimensions, makeNode } from "./defaults";
import { focusEditor } from "./nodes/editorFocusRegistry";
import type { AppEdge, AppNode, QueryData } from "./types";
import { useCanvas } from "./hooks/useCanvas";
import { useDrawTool } from "./hooks/useDrawTool";
import { useSchemaForceLayout } from "./hooks/useSchemaForceLayout";
import { useResultDropOnChat } from "./hooks/useResultDropOnChat";
import { getStroke } from "perfect-freehand";
import { FloatingEdge } from "./edges/FloatingEdge";
import "./nodes/node.css";

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
  const [placeMode, setPlaceMode] = useAtom(placeModeAtom);
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const { livePoints, strokeWidth: drawStrokeWidth, color: drawColor } = useDrawTool();
  useCursorBroadcast();
  const { onSchemaNodeDragStart, onSchemaNodeDrag, onSchemaNodeDragStop } = useSchemaForceLayout();
  const onNodeDragStop = useResultDropOnChat(onSchemaNodeDragStop);

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

  const isValidVariableConnection = useCallback<IsValidConnection<AppEdge>>(
    connection => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return false;
      }
      const source = rf.getNode(connection.source);
      const target = rf.getNode(connection.target);
      if (!source || !target) {
        return false;
      }
      return source.type === "variable" && target.type === "query";
    },
    [rf],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }
      if (!isValidVariableConnection(connection)) {
        return;
      }
      canvas.connect(connection.source, connection.target);
    },
    [canvas, isValidVariableConnection],
  );

  const styledEdges = useMemo(() => {
    const selectedQueryIds = new Set(
      nodes.filter(n => n.type === "query" && n.selected).map(n => n.id),
    );
    const liveQueryIds = new Set(
      nodes
        .filter(
          node =>
            node.type === "query" && ((node.data as QueryData).liveIntervalMs ?? null) !== null,
        )
        .map(node => node.id),
    );
    if (selectedQueryIds.size === 0 && liveQueryIds.size === 0) {
      return edges;
    }
    const resultIds = new Set(nodes.filter(n => n.type === "result").map(n => n.id));
    return edges.map(edge => {
      if (!resultIds.has(edge.target)) {
        return edge;
      }
      const existing = edge.className ?? "";
      const parts: string[] = existing ? [existing] : [];
      if (selectedQueryIds.has(edge.source) && !existing.includes("query-active")) {
        parts.push("query-active");
      }
      if (liveQueryIds.has(edge.source) && !existing.includes("query-live")) {
        parts.push("query-live");
      }
      if (parts.length === (existing ? 1 : 0)) {
        return edge;
      }
      return { ...edge, className: parts.join(" ").trim() };
    });
  }, [nodes, edges]);

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (!placeMode) {
        return;
      }
      if (placeMode === "draw") {
        return;
      }
      const flowPos = rf.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      const dims = defaultDimensions[placeMode];
      const node = makeNode(placeMode, {
        x: flowPos.x - dims.w / 2,
        y: flowPos.y - dims.h / 2,
      });
      canvas.addNode(node);
      rf.setCenter(flowPos.x, flowPos.y, { zoom: 1, duration: 300 });
      if (node.type === "query" || node.type === "ai-prompt") {
        focusEditor(node.id);
      }
      setPlaceMode(null);
    },
    [placeMode, rf, canvas, setPlaceMode],
  );

  const onNodeDragStart = useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, dragged: AppNode) => {
      onSchemaNodeDragStart(dragged);
    },
    [onSchemaNodeDragStart],
  );

  const onNodeDrag = useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, dragged: AppNode) => {
      onSchemaNodeDrag(dragged);
    },
    [onSchemaNodeDrag],
  );

  return (
    <>
      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidVariableConnection}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={(_, vp) => setViewport(vp)}
        defaultViewport={initialViewport}
        colorMode={"dark"}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode='Shift'
        onlyRenderVisibleElements
        selectionOnDrag={placeMode !== "draw"}
        nodesDraggable={placeMode !== "draw"}
        elementsSelectable={placeMode !== "draw"}
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
          placeMode === "draw"
            ? "place-mode-active draw-mode-active"
            : placeMode
              ? "place-mode-active"
              : undefined
        }
      >
        <Background
          variant={BackgroundVariant.Dots}
          bgColor='rgba(0, 0, 0, 0.7)'
          color='#333'
          gap={24}
          size={1.4}
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
      <CanvasApiPublisher />
      <KeyboardShortcuts />
    </>
  );
}
