import { getDefaultStore } from "jotai";
import { engineFromUrl } from "../Connection/engine";
import { activeConnectionAtom } from "../Connection/state";
import { documentAtom } from "../canvas/state";
import { schemaAtom } from "../state";
import { formatSchema } from "./formatSchema";
import type { AppNode } from "../canvas/types";

// Result rows must never reach the agent. Result nodes keep their rows in the
// results sidecar, but barchart nodes embed them in `data.data` — strip any such
// field defensively before handing page content over.
function stripData(node: AppNode): AppNode {
  if (!node.data || !("data" in node.data)) {
    return node;
  }
  const data = { ...(node.data as Record<string, unknown>) };
  delete data.data;
  return { ...node, data } as AppNode;
}

export function getConnectionInfo(): unknown {
  const conn = getDefaultStore().get(activeConnectionAtom);
  if (!conn) {
    return null;
  }
  return { name: conn.connection.name, engine: engineFromUrl(conn.connection.url) };
}

export function getDbSchema(params?: { tables?: string[] }): string {
  return formatSchema(getDefaultStore().get(schemaAtom), params?.tables);
}

export function getActivePageId(): unknown {
  return { activePageId: getDefaultStore().get(documentAtom).activePageId };
}

export function getPages(): unknown {
  const doc = getDefaultStore().get(documentAtom);
  return doc.pageOrder.map((id, order) => ({
    id,
    name: doc.pages[id]?.name ?? "",
    order,
  }));
}

export function getPageContent(params: Record<string, unknown>): unknown {
  const doc = getDefaultStore().get(documentAtom);
  const page = doc.pages[params.pageId as string];
  if (!page) {
    return null;
  }
  return { ...page, nodes: page.nodes.map(stripData) };
}
