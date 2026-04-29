import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { clipboardAtom, nodesAtom, placeModeAtom } from "../state";
import { formatPreservingVars } from "../variables";
import { useCanvas } from "../useCanvas";
import { usePageActions } from "../usePageActions";
import { focusQueryEditor } from "../nodes/Query/editorFocusRegistry";
import { ids } from "../ids";
import { useUndoHistory } from "../useUndoHistory";
import type { AppNode, AppNodeType, QueryNode } from "../types";
import { useHotkeys } from "@mantine/hooks";

function newIdForType(type: AppNodeType): string {
  switch (type) {
    case "query":
      return ids.query();
    case "ai-prompt":
      return ids.ai();
    case "result":
      return ids.result(ids.query());
    case "chat":
      return ids.chat(ids.query());
    case "barchart":
      return ids.chart(ids.query());
    case "query-error":
      return ids.error(ids.query());
    case "table-definition":
      return ids.query();
    case "text":
      return ids.text();
    case "variable":
      return ids.variable();
    case "draw":
      return ids.draw();
  }
}

function findActiveQueryNode(canvas: ReturnType<typeof useCanvas>): QueryNode | undefined {
  const focusedEl = document.activeElement?.closest("[data-id]");
  const focusedId = focusedEl?.getAttribute("data-id") ?? undefined;
  const candidates: (AppNode | undefined)[] = [];
  if (focusedId) candidates.push(canvas.getNode(focusedId));
  candidates.push(canvas.getSelectedNodes().find((n) => n.type === "query"));
  return candidates.find((n): n is QueryNode => !!n && n.type === "query");
}

function isTextInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.classList.contains("monaco-editor")) return true;
  if (el.closest(".monaco-editor")) return true;
  return false;
}

export function KeyboardShortcuts() {
  const canvas = useCanvas();
  const setPlaceMode = useSetAtom(placeModeAtom);
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const setNodes = useSetAtom(nodesAtom);
  const pageActions = usePageActions();
  const { undo, redo } = useUndoHistory();
  useHotkeys([
    [
      "Escape",
      () => {
        setPlaceMode(null);
        canvas.deselectAll();
      },
    ],
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;

      if (meta && e.shiftKey && e.code === "KeyI") {
        const target = findActiveQueryNode(canvas);
        if (!target) return;
        e.preventDefault();
        try {
          const formatted = formatPreservingVars(target.data.query, {
            keywordCase: "upper",
            functionCase: "upper",
            language: "postgresql",
          });
          canvas.updateNodeData(target.id, { query: formatted });
        } catch {
          // ignore format errors
        }
        return;
      }

      if (isTextInputFocused()) return;

      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      if (meta && e.key === "c") {
        const selected = canvas.getSelectedNodes();
        if (selected.length > 0) {
          setClipboard(selected);
        }
        return;
      }

      if (meta && e.key === "v") {
        if (clipboard.length === 0) return;
        e.preventDefault();
        const OFFSET = 20;
        const copies: AppNode[] = clipboard.map((node) => ({
          ...node,
          id: newIdForType(node.type as AppNodeType),
          position: { x: node.position.x + OFFSET, y: node.position.y + OFFSET },
          selected: true,
        }));
        setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), ...copies]);
        canvas.selectOnly(copies.map((n) => n.id));
        return;
      }

      if (e.key === "Enter" && !meta) {
        const selected = canvas.getSelectedNodes()[0];
        if (selected?.type === "query") {
          e.preventDefault();
          focusQueryEditor(selected.id);
        }
        return;
      }

      if (e.key.toLowerCase() === "q" && !meta) {
        e.preventDefault();
        setPlaceMode("query");
        return;
      }

      if (e.key.toLowerCase() === "a" && !meta) {
        e.preventDefault();
        setPlaceMode("ai-prompt");
        return;
      }

      if (e.key.toLowerCase() === "t" && !meta) {
        e.preventDefault();
        setPlaceMode("text");
        return;
      }

      if (e.key.toLowerCase() === "v" && !meta) {
        e.preventDefault();
        setPlaceMode("variable");
        return;
      }

      if (e.key.toLowerCase() === "d" && !meta) {
        e.preventDefault();
        setPlaceMode("draw");
        return;
      }

      if (meta && e.key === "a") {
        e.preventDefault();
        const ids = canvas.getNodes().map((n) => n.id);
        canvas.selectOnly(ids);
        return;
      }

      if (meta && shift && e.key === "0") {
        e.preventDefault();
        canvas.fitView();
        return;
      }

      if (meta && e.key === "0") {
        e.preventDefault();
        canvas.resetZoom();
        return;
      }

      if (meta && !shift && e.key === "t") {
        e.preventDefault();
        pageActions.newPage();
        return;
      }

      if (meta && !shift && e.key === "w") {
        e.preventDefault();
        pageActions.closeActivePage();
        return;
      }

      if (meta && !shift && /^[1-9]$/.test(e.key)) {
        const targetIdx = Number(e.key) - 1;
        if (targetIdx >= pageActions.pages.length) return;
        e.preventDefault();
        pageActions.goToPageByIndex(targetIdx);
        return;
      }

      if (meta && shift && (e.code === "BracketLeft" || e.code === "BracketRight")) {
        e.preventDefault();
        if (e.code === "BracketRight") pageActions.nextPage();
        else pageActions.previousPage();
        return;
      }

      if (meta && !shift && (e.key === "]" || e.key === "[")) {
        e.preventDefault();
        const queries = canvas
          .getNodes()
          .filter((n) => n.type === "query")
          .slice()
          .sort((a, b) => a.position.x - b.position.x);
        if (queries.length === 0) return;

        const selected = canvas.getSelectedNodes()[0];
        let idx = -1;
        if (selected && selected.type === "query") {
          idx = queries.findIndex((n) => n.id === selected.id);
        }
        const nextIdx =
          e.key === "]"
            ? (idx + 1 + queries.length) % queries.length
            : (idx - 1 + queries.length) % queries.length;
        const target = queries[nextIdx];
        canvas.selectOnly(target.id);
        canvas.panToNode(target.id, { zoom: 1, duration: 300 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvas, setPlaceMode, clipboard, setClipboard, setNodes, pageActions, undo, redo]);

  return null;
}
