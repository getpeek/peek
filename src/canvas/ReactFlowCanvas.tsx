import {
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
import { uiVisibilityAtom } from "../state";
import {
  activePageIdAtom,
  cameraLockedAtom,
  edgesAtom,
  nodesAtom,
  placeModeAtom,
  viewportAtom,
} from "./state";
import { CanvasApiPublisher } from "./CanvasApiPublisher";
import { CanvasBackground } from "./CanvasBackground";
import { historyPreviewAtom } from "./history/state";
import { AgentNode } from "./nodes/Agent/AgentNode";
import { BarChartNode } from "./nodes/BarChart/BarChartNode";
import { DrawNode } from "./nodes/Draw/DrawNode";
import { LiveStroke } from "./nodes/Draw/LiveStroke";
import { QueryErrorNode } from "./nodes/QueryError/QueryErrorNode";
import { QueryNode } from "./nodes/Query/QueryNode";
import { ResultNode } from "./nodes/Result/ResultNode";
import { ResultInsertFormNode } from "./nodes/ResultInsertForm/ResultInsertFormNode";
import { TableDefinitionNode } from "./nodes/TableDefinition/TableDefinitionNode";
import { TextNode } from "./nodes/Text/TextNode";
import { ActivityNode } from "./nodes/Activity/ActivityNode";
import { VariableNode } from "./nodes/Variable/VariableNode";
import { BottomRightStack } from "./ui/BottomRightStack";
import { JumpLabels } from "./jump/JumpLabels";
import { RegionHalos } from "./wayfinding/RegionHalos";
import { WayfindingLayer } from "./wayfinding/WayfindingLayer";
import { Toolbar } from "./ui/Toolbar";
import { ZoomIndicator } from "./ui/ZoomIndicator";
import { RemoteCursorsLayer } from "../multiplayer/RemoteCursorsLayer";
import { useCursorBroadcast } from "../multiplayer/useCursorBroadcast";
import { useFollowPeer } from "../multiplayer/useFollowPeer";
import { useViewportBroadcast } from "../multiplayer/useViewportBroadcast";
import { followingAuthorAtom } from "../multiplayer/state";
import type { AppEdge, AppNode, AppNodeType } from "./types";
import { useCanvas } from "./hooks/useCanvas";
import { useDrawTool } from "./hooks/useDrawTool";
import { useInteractionState } from "./hooks/useInteractionState";
import { useMetaKeyHeld } from "./hooks/useMetaKeyHeld";
import { useNodeEntryAnimation } from "./hooks/useNodeEntryAnimation";
import { usePlaceTool } from "./hooks/usePlaceTool";
import { useRubberBandSelect } from "./hooks/useRubberBandSelect";
import { useSchemaForceLayout } from "./hooks/useSchemaForceLayout";
import { useSelectionHighlight } from "./hooks/useSelectionHighlight";
import { useViewportSync } from "./hooks/useViewportSync";
import { useZoomVariable } from "./hooks/useZoomVariable";
import { LassoOverlay } from "./LassoOverlay";
import { useConnectionDragHighlight } from "./hooks/useConnectionDragHighlight";
import { FloatingEdge } from "./edges/FloatingEdge";
import "./nodes/node.css";
import { PeekKeyboardShortcuts } from "./ui/KeyboardShortcuts";

const nodeTypes = {
  query: QueryNode,
  result: ResultNode,
  "result-insert-form": ResultInsertFormNode,
  agent: AgentNode,
  barchart: BarChartNode,
  "query-error": QueryErrorNode,
  "table-definition": TableDefinitionNode,
  text: TextNode,
  variable: VariableNode,
  draw: DrawNode,
  activity: ActivityNode,
};

const edgeTypes = { floating: FloatingEdge };

const defaultEdgeOptions = { type: "floating" };

const VARIABLE_CONNECTION_TARGETS: AppNodeType[] = ["query", "result", "result-insert-form"];

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
  const viewport = useAtomValue(viewportAtom);
  const setViewport = useSetAtom(viewportAtom);
  const activePageId = useAtomValue(activePageIdAtom);
  const placeMode = useAtomValue(placeModeAtom);
  const uiVisible = useAtomValue(uiVisibilityAtom);
  const cameraLocked = useAtomValue(cameraLockedAtom);
  const historyPreview = useAtomValue(historyPreviewAtom);
  const previewing = historyPreview !== null && historyPreview.pageId === activePageId;
  const rf = useReactFlow<AppNode, AppEdge>();
  const canvas = useCanvas();
  const interaction = useInteractionState();

  useViewportSync();
  const { livePoints, strokeWidth: drawStrokeWidth, color: drawColor } = useDrawTool();
  usePlaceTool();
  const { rectRef: selectionRectRef } = useRubberBandSelect();
  useZoomVariable();
  useCursorBroadcast();
  useFollowPeer();
  const broadcastViewport = useViewportBroadcast();
  const setFollowing = useSetAtom(followingAuthorAtom);
  const metaHeld = useMetaKeyHeld();
  const { onSchemaNodeDragStart, onSchemaNodeDrag, onSchemaNodeDragStop } = useSchemaForceLayout();

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      // While a history preview is on screen React Flow computes changes
      // (dimension measurements, removals) against the *preview* nodes —
      // applying them to the real document would corrupt it.
      if (previewing) {
        return;
      }
      // Resize arrives as dimension changes with `resizing` — freeze too.
      if (changes.some(c => c.type === "dimensions" && c.resizing)) {
        interaction.begin();
        interaction.endDebounced();
      }
      setNodes(ns => applyNodeChanges(changes, ns));
    },
    [setNodes, interaction, previewing],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<AppEdge>[]) => {
      if (previewing) {
        return;
      }
      setEdges(es => applyEdgeChanges(changes, es));
    },
    [setEdges, previewing],
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
      if (source.type === "variable" && VARIABLE_CONNECTION_TARGETS.includes(target.type)) {
        return true;
      }
      if (source.type === "result" && target.type === "agent") {
        return true;
      }
      return false;
    },
    [rf],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (previewing || !c.source || !c.target || !isValidConnection(c)) {
        return;
      }
      canvas.connect(c.source, c.target);
    },
    [canvas, isValidConnection, previewing],
  );

  const connectionDrag = useConnectionDragHighlight();

  // Entry animation tracks the REAL nodes even while previewing, so scrubbing
  // between versions doesn't replay the pop-in for every reappearing node.
  const enteringNodes = useNodeEntryAnimation(nodes);
  const { styledNodes, styledEdges } = useSelectionHighlight(
    previewing ? historyPreview.snapshot.nodes : enteringNodes,
    previewing ? historyPreview.snapshot.edges : edges,
  );

  // Node drags flip `data-interacting` too, so heavy bodies freeze while moving.
  const onNodeDragStart = useCallback(
    (_e: unknown, n: AppNode) => {
      interaction.begin();
      onSchemaNodeDragStart(n);
    },
    [interaction, onSchemaNodeDragStart],
  );
  const onNodeDrag = useCallback(
    (_e: unknown, n: AppNode) => onSchemaNodeDrag(n),
    [onSchemaNodeDrag],
  );
  const onNodeDragStop = useCallback(
    (_e: unknown, n: AppNode) => {
      onSchemaNodeDragStop(n);
      interaction.endDebounced();
    },
    [interaction, onSchemaNodeDragStop],
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
        onConnectStart={connectionDrag.onConnectStart}
        onConnectEnd={connectionDrag.onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveStart={e => {
          // A real pointer/touch event means the local user grabbed the
          // canvas; programmatic camera moves (including follow) pass null.
          if (e) {
            setFollowing(null);
          }
          interaction.begin();
        }}
        onMove={(_, vp) => broadcastViewport(vp)}
        onMoveEnd={(_, vp) => {
          setViewport(vp);
          interaction.endDebounced();
        }}
        defaultViewport={viewport}
        colorMode={"dark"}
        deleteKeyCode={previewing ? null : ["Backspace", "Delete"]}
        multiSelectionKeyCode='Shift'
        onlyRenderVisibleElements
        selectionKeyCode={null}
        selectionOnDrag={false}
        noDragClassName={metaHeld ? "nodrag-disabled" : "nodrag"}
        nodesDraggable={placeMode === null && !previewing}
        elementsSelectable={placeMode === null && !previewing}
        selectionMode={SelectionMode.Partial}
        panOnDrag={cameraLocked ? false : [1, 2]}
        panOnScroll={!cameraLocked}
        zoomOnScroll={false}
        zoomOnPinch={!cameraLocked}
        zoomOnDoubleClick={false}
        panActivationKeyCode={cameraLocked ? null : "Space"}
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
            connectionDrag.sourceHint ?? "",
            connectionDrag.connecting ? "connecting" : "",
            metaHeld ? "drag-anywhere" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        <CanvasBackground />
        {uiVisible && <Toolbar />}
        {uiVisible && <ZoomIndicator />}
        {!previewing && <RegionHalos />}
        <WayfindingLayer />
        {!previewing && <JumpLabels />}
        <BottomRightStack />
        <RemoteCursorsLayer />
      </ReactFlow>
      <LiveStroke
        points={livePoints}
        strokeWidth={drawStrokeWidth}
        color={drawColor}
        zoom={rf.getViewport().zoom}
      />
      <div ref={selectionRectRef} className='rubber-band-rect' />
      <LassoOverlay />
      <CanvasApiPublisher />
      <PeekKeyboardShortcuts />
    </>
  );
}
