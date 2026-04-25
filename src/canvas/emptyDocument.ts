import { ids } from "./ids";
import type { CanvasDocument, PageState } from "./types";

export function emptyPage(name = "Page 1"): PageState {
  return {
    id: ids.page(),
    name,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function emptyDocument(): CanvasDocument {
  const page = emptyPage();
  return {
    version: 1,
    activePageId: page.id,
    pageOrder: [page.id],
    pages: { [page.id]: page },
  };
}
