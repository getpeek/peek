import { useSetAtom, useAtom } from "jotai";
import { exit } from "@tauri-apps/plugin-process";
import { useCanvas } from "../hooks/useCanvas";
import { usePageActions } from "../hooks/usePageActions";
import { uiVisibilityAtom } from "../../state";
import { placeModeAtom, selectionToolAtom, clipboardAtom, nodesAtom } from "../state";
import { useUndoHistory } from "./useUndoHistory";
import { useHotkey } from "../../app/useHotkey";
import { newIdForType } from "./KeyboardShortcuts";
import { AppNode, AppNodeType } from "../types";

export const usePeekHotkeys = () => {
  const canvas = useCanvas();
  const setPlaceMode = useSetAtom(placeModeAtom);
  const setSelectionTool = useSetAtom(selectionToolAtom);
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setUiVisible = useSetAtom(uiVisibilityAtom);
  const pageActions = usePageActions();
  const { undo, redo } = useUndoHistory();

  useHotkey("meta-q", () => {
    exit(0);
  });

  // Clipboard
  useHotkey("meta-x", () => {
    const selected = canvas.getSelectedNodes();
    if (selected.length === 0) {
      return;
    }
    setClipboard(selected);
    selected.forEach(node => canvas.deleteNode(node.id));
  });

  useHotkey("meta-c", () => {
    const selected = canvas.getSelectedNodes();
    if (selected.length > 0) {
      setClipboard(selected);
    }
  });

  useHotkey("meta-v", () => {
    if (clipboard.length === 0) {
      return;
    }
    const translation = pasteTranslation(clipboard, canvas.screenToFlowPosition);
    const copies: AppNode[] = clipboard.map(node => ({
      ...node,
      id: newIdForType(node.type as AppNodeType),
      position: {
        x: node.position.x + translation.x,
        y: node.position.y + translation.y,
      },
      selected: true,
    }));
    setNodes(prev => [...prev.map(n => ({ ...n, selected: false })), ...copies]);
    canvas.selectOnly(copies.map(n => n.id));
  });
  useHotkey("meta-z", undo);
  useHotkey("shift-meta-z", redo);

  // Selection

  useHotkey("meta-a", () => {
    const nodeIds = canvas.getNodes().map(n => n.id);
    canvas.selectOnly(nodeIds);
  });

  // Page actions

  useHotkey("backspace", () => {
    canvas.getSelectedNodes().forEach(node => canvas.deleteNode(node.id));
  });

  useHotkey("meta-0", () => {
    canvas.resetZoom();
  });

  useHotkey("meta-shift-0", () => {
    canvas.fitView();
  });

  useHotkey("meta-t", () => {
    pageActions.newPage();
  });
  useHotkey("meta-w", () => {
    pageActions.closeActivePage();
  });
  useHotkey("meta-shift-[", () => {
    pageActions.previousPage();
  });
  useHotkey("meta-shift-]", () => {
    pageActions.nextPage();
  });

  useHotkey("meta-[", () => {
    pageActions.previousQueryNodeOnPage();
  });
  useHotkey("meta-]", () => {
    pageActions.nextQueryNodeOnPage();
  });

  useHotkey("meta-arrowright", () => {
    pageActions.nodeInDirection("right");
  });
  useHotkey("meta-arrowleft", () => {
    pageActions.nodeInDirection("left");
  });
  useHotkey("meta-arrowup", () => {
    pageActions.nodeInDirection("up");
  });
  useHotkey("meta-arrowdown", () => {
    pageActions.nodeInDirection("down");
  });

  // Tools

  useHotkey("escape", () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    setPlaceMode(null);
    setSelectionTool("default");
    canvas.deselectAll();
  });
  useHotkey("l", () => {
    setSelectionTool("lasso");
    setPlaceMode(null);
  });

  useHotkey("q", () => {
    setPlaceMode("query");
  });

  useHotkey("a", () => {
    setPlaceMode("agent");
  });

  useHotkey("t", () => {
    setPlaceMode("text");
  });

  useHotkey("d", () => {
    setPlaceMode("draw");
  });

  useHotkey("v", () => {
    setPlaceMode("variable");
  });

  // View

  useHotkey("meta-.", () => {
    setUiVisible(v => !v);
  });
};

const FALLBACK_OFFSET = 20;

function pasteTranslation(
  nodes: AppNode[],
  screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number },
): { x: number; y: number } {
  const pane = document.querySelector<HTMLElement>(".react-flow__pane");
  if (!pane) {
    return { x: FALLBACK_OFFSET, y: FALLBACK_OFFSET };
  }
  const xs = nodes.map(n => n.position.x);
  const ys = nodes.map(n => n.position.y);
  const rights = nodes.map(n => n.position.x + (n.width ?? n.measured?.width ?? 0));
  const bottoms = nodes.map(n => n.position.y + (n.height ?? n.measured?.height ?? 0));
  const bboxCenter = {
    x: (Math.min(...xs) + Math.max(...rights)) / 2,
    y: (Math.min(...ys) + Math.max(...bottoms)) / 2,
  };
  const rect = pane.getBoundingClientRect();
  const viewportCenter = screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
  return {
    x: viewportCenter.x - bboxCenter.x,
    y: viewportCenter.y - bboxCenter.y,
  };
}
