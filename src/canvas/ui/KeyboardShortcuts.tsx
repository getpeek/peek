import { useCanvas } from "../hooks/useCanvas";
import { ids } from "../ids";
import type { AppNode, AppNodeType, QueryNode } from "../types";
import { usePeekHotkeys } from "./usePeekHotkeys";

export function newIdForType(type: AppNodeType): string {
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

export function findActiveQueryNode(canvas: ReturnType<typeof useCanvas>): QueryNode | undefined {
  const focusedEl = document.activeElement?.closest("[data-id]");
  const focusedId = focusedEl instanceof HTMLElement ? focusedEl.dataset.id : undefined;
  const candidates: (AppNode | undefined)[] = [];
  if (focusedId) {
    candidates.push(canvas.getNode(focusedId));
  }
  candidates.push(canvas.getSelectedNodes().find(n => n.type === "query"));
  return candidates.find((n): n is QueryNode => !!n && n.type === "query");
}

export function isTextInputFocused() {
  const el = document.activeElement;
  if (!el) {
    return false;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  if ((el as HTMLElement).isContentEditable) {
    return true;
  }
  if (el.classList.contains("monaco-editor")) {
    return true;
  }
  if (el.closest(".monaco-editor")) {
    return true;
  }
  return false;
}

export const PeekKeyboardShortcuts = () => {
  usePeekHotkeys();

  return null;
};
