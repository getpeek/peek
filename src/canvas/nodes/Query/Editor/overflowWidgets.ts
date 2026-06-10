import type { editor } from "monaco-editor";

let overflowWidgetsDomNode: HTMLElement | null = null;

export function getOverflowWidgetsDomNode(): HTMLElement {
  if (overflowWidgetsDomNode) {
    return overflowWidgetsDomNode;
  }
  const node = document.createElement("div");
  node.className = "monaco-editor monaco-overflow-widgets-root";
  node.style.position = "absolute";
  node.style.top = "0";
  node.style.left = "0";
  node.style.zIndex = "10000";
  document.body.append(node);
  overflowWidgetsDomNode = node;
  return node;
}

// The overflow widgets (hover tooltips, completion popups, parameter hints)
// live in a body-level node so they escape the query node's clipping. Monaco
// positions them at `scaledEditorTopLeft + unscaledLocalOffset`, which drifts
// from the anchor whenever the canvas zoom isn't 1. Scaling the whole node by
// the zoom, anchored at the active editor's on-screen top-left, maps each
// widget to `editorTopLeft + localOffset * zoom` and renders it at the editor's
// own scale. A no-op at zoom 1.
export function syncOverflowWidgetsScale(ed: editor.IStandaloneCodeEditor, zoom: number) {
  const node = overflowWidgetsDomNode;
  const editorDom = ed.getDomNode();
  if (!node || !editorDom) {
    return;
  }
  const rect = editorDom.getBoundingClientRect();
  node.style.transformOrigin = `${rect.left}px ${rect.top}px`;
  node.style.transform = `scale(${zoom})`;
}
