import { useSetAtom, useAtom } from "jotai";
import { useCanvas } from "../hooks/useCanvas";
import { usePageActions } from "../hooks/usePageActions";
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
  const pageActions = usePageActions();
  const { undo, redo } = useUndoHistory();

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
    const OFFSET = 20;
    const copies: AppNode[] = clipboard.map(node => ({
      ...node,
      id: newIdForType(node.type as AppNodeType),
      position: { x: node.position.x + OFFSET, y: node.position.y + OFFSET },
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
    setPlaceMode("ai-prompt");
  });

  useHotkey("t", () => {
    setPlaceMode("text");
  });

  useHotkey("v", () => {
    setPlaceMode("variable");
  });
};
