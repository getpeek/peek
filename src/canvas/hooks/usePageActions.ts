import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, documentAtom, pendingPageCloseAtom, type CanvasApi } from "../state";
import type { AppNode, PageState } from "../types";

export interface PageActions {
  pages: PageState[];
  activePageId: string;
  canClose: boolean;
  newPage: (name?: string) => string | undefined;
  closePage: (pageId: string) => void;
  closeActivePage: () => void;
  nextQueryNodeOnPage: () => void;
  previousQueryNodeOnPage: () => void;
  switchPage: (pageId: string) => void;
  goToPageByIndex: (index: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  nodeInDirection: (direction: "up" | "down" | "left" | "right") => void;
  renamePage: (pageId: string, name: string) => void;
  reorderPage: (pageId: string, toIndex: number) => void;
}

type Direction = "up" | "down" | "left" | "right";

// Off-axis drift costs double, so among nodes inside the cone the one most
// squarely in the pressed direction wins even if a skewed node sits nearer.
const PERPENDICULAR_PENALTY = 2;

const centerOf = (node: AppNode): { x: number; y: number } => {
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
};

/**
 * Pick the best node in `direction` from `origin` using a 45° cone on node
 * centres: a candidate only counts if its off-axis drift is within its
 * forward distance, so pressing ↑ never jumps to a node that's really off to
 * the side — beyond 45° the perpendicular arrow owns it. This is what makes
 * arrow navigation feel right when targets sit at an arbitrary angle.
 */
const pickInDirection = (
  nodes: AppNode[],
  origin: AppNode,
  direction: Direction,
): AppNode | undefined => {
  const from = centerOf(origin);
  const scored = nodes.flatMap(node => {
    if (node.id === origin.id) {
      return [];
    }
    const to = centerOf(node);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const forward =
      direction === "up" ? -dy : direction === "down" ? dy : direction === "left" ? -dx : dx;
    const drift = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);
    if (forward <= 0 || drift > forward) {
      return [];
    }
    return [{ node, score: forward + drift * PERPENDICULAR_PENALTY }];
  });
  if (scored.length === 0) {
    return undefined;
  }
  return scored.reduce((best, candidate) => (candidate.score < best.score ? candidate : best)).node;
};

// With nothing selected, the arrow keys anchor on whatever node is nearest the
// viewport centre and walk outward from there.
const nearestToViewportCenter = (nodes: AppNode[], canvas: CanvasApi): AppNode | undefined => {
  const rect = document.querySelector<HTMLElement>(".react-flow")?.getBoundingClientRect();
  if (!rect) {
    return nodes[0];
  }
  const center = canvas.screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
  const distanceTo = (node: AppNode) => {
    const c = centerOf(node);
    return (c.x - center.x) ** 2 + (c.y - center.y) ** 2;
  };
  return nodes.reduce((best, node) => (distanceTo(node) < distanceTo(best) ? node : best));
};

export function usePageActions(): PageActions {
  const canvas = useAtomValue(canvasApiAtom);
  const doc = useAtomValue(documentAtom);
  const setPendingClose = useSetAtom(pendingPageCloseAtom);

  const pages = doc.pageOrder.map(id => doc.pages[id]).filter((p): p is PageState => !!p);

  const cycle = (delta: number) => {
    if (!canvas || doc.pageOrder.length <= 1) {
      return;
    }
    const idx = doc.pageOrder.indexOf(doc.activePageId);
    if (idx === -1) {
      return;
    }
    const len = doc.pageOrder.length;
    const next = (idx + delta + len) % len;
    canvas.switchPage(doc.pageOrder[next]);
  };

  const requestClose = (pageId: string) => {
    if (!canvas || doc.pageOrder.length <= 1) {
      return;
    }
    const page = doc.pages[pageId];
    if (!page) {
      return;
    }
    if (page.nodes.length === 0) {
      canvas.deletePage(pageId);
      return;
    }
    setPendingClose({ pageId });
  };

  const cycleActiveQueryNode = (direction: 1 | -1) => {
    if (!canvas) {
      return;
    }

    const queries = canvas
      .getNodes()
      .filter(n => n.type === "query")
      .slice()
      .toSorted((a, b) => a.position.x - b.position.x);
    if (queries.length === 0) {
      return;
    }

    const selected = canvas.getSelectedNodes()[0];
    let idx = -1;
    if (selected && selected.type === "query") {
      idx = queries.findIndex(n => n.id === selected.id);
    }
    const nextIdx = (idx + direction + queries.length) % queries.length;
    const target = queries[nextIdx];
    canvas.selectOnly(target.id);
    canvas.panToNode(target.id, { zoom: 1, duration: 300 });
  };

  return {
    pages,
    activePageId: doc.activePageId,
    canClose: doc.pageOrder.length > 1,
    newPage: name => canvas?.addPage(name),
    closePage: requestClose,
    closeActivePage: () => requestClose(doc.activePageId),
    switchPage: pageId => canvas?.switchPage(pageId),
    nextQueryNodeOnPage: () => {
      cycleActiveQueryNode(1);
    },
    previousQueryNodeOnPage: () => {
      cycleActiveQueryNode(-1);
    },
    nodeInDirection: (direction: Direction) => {
      if (!canvas) {
        return;
      }
      const nodes = canvas.getNodes();
      if (nodes.length === 0) {
        return;
      }

      const selected = canvas.getSelectedNodes().at(0);
      // No selection yet: the first press just anchors on the nearest node;
      // from there each press steps to the next node in the pressed cone.
      const target = selected
        ? pickInDirection(nodes, selected, direction)
        : nearestToViewportCenter(nodes, canvas);
      if (!target) {
        return;
      }

      canvas.selectOnly(target.id);
      canvas.panToNode(target.id, { zoom: canvas.getZoom() });
    },
    goToPageByIndex: index => {
      if (!canvas) {
        return;
      }
      const id = doc.pageOrder[index];
      if (!id) {
        return;
      }
      canvas.switchPage(id);
    },
    nextPage: () => cycle(1),
    previousPage: () => cycle(-1),
    renamePage: (pageId, name) => canvas?.renamePage(pageId, name),
    reorderPage: (pageId, toIndex) => canvas?.reorderPage(pageId, toIndex),
  };
}
