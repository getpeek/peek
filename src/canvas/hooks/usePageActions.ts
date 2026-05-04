import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, documentAtom, pendingPageCloseAtom } from "../state";
import type { PageState } from "../types";

export interface PageActions {
  pages: PageState[];
  activePageId: string;
  canClose: boolean;
  newPage: (name?: string) => string | undefined;
  closePage: (pageId: string) => void;
  closeActivePage: () => void;
  switchPage: (pageId: string) => void;
  goToPageByIndex: (index: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  renamePage: (pageId: string, name: string) => void;
  reorderPage: (pageId: string, toIndex: number) => void;
}

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

  return {
    pages,
    activePageId: doc.activePageId,
    canClose: doc.pageOrder.length > 1,
    newPage: name => canvas?.addPage(name),
    closePage: requestClose,
    closeActivePage: () => requestClose(doc.activePageId),
    switchPage: pageId => canvas?.switchPage(pageId),
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
