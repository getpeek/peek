import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { format } from "sql-formatter";
import { placeModeAtom } from "../state";
import { useCanvas } from "../useCanvas";
import { focusQueryEditor } from "../nodes/Query/editorFocusRegistry";
import type { AppNode, QueryNode } from "../types";

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;

      if (e.key === "Escape") {
        setPlaceMode(null);
        canvas.deselectAll();
        return;
      }

      if (meta && e.shiftKey && e.code === "KeyI") {
        const target = findActiveQueryNode(canvas);
        if (!target) return;
        e.preventDefault();
        try {
          const formatted = format(target.data.query, {
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

      if (meta && e.key === "a") {
        e.preventDefault();
        const ids = canvas.getNodes().map((n) => n.id);
        canvas.selectOnly(ids);
        return;
      }

      if (shift && e.key === "0") {
        e.preventDefault();
        canvas.resetZoom();
        return;
      }

      if (meta && (e.key === "]" || e.key === "[")) {
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
  }, [canvas, setPlaceMode]);

  return null;
}
