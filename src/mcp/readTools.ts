import { getDefaultStore } from "jotai";
import { activeConnectionAtom } from "../Connection/state";
import { documentAtom } from "../canvas/state";
import { schemaAtom } from "../state";
import type { AppNode } from "../canvas/types";

// Only the URL scheme is exposed — the URL (with credentials) never leaves the
// frontend.
function engineFromUrl(url: string): string | null {
  const scheme = url.split("://", 1)[0]?.toLowerCase();
  if (scheme === "postgres" || scheme === "postgresql") {
    return "postgresql";
  }
  if (scheme === "mysql" || scheme === "mariadb") {
    return "mysql";
  }
  return scheme || null;
}

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

export function getDbSchema(): unknown {
  return getDefaultStore().get(schemaAtom);
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
