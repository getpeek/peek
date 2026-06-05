import { getDefaultStore } from "jotai";
import { documentAtom } from "../canvas/state";
import { emptyPage } from "../canvas/emptyDocument";

export function createPage(params: Record<string, unknown>): unknown {
  const name = params.name as string;
  const requestedOrder = params.order as number;

  const store = getDefaultStore();
  const order = Math.max(0, Math.min(requestedOrder, store.get(documentAtom).pageOrder.length));
  const page = emptyPage(name);

  store.set(documentAtom, doc => {
    const pageOrder = [...doc.pageOrder];
    pageOrder.splice(order, 0, page.id);
    return {
      ...doc,
      activePageId: page.id,
      pageOrder,
      pages: { ...doc.pages, [page.id]: page },
    };
  });

  return { id: page.id, name, order };
}
