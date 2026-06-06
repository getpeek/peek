import { getDefaultStore } from "jotai";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { activeConnectionAtom } from "../Connection/state";
import { documentAtom } from "../canvas/state";
import { schemaAtom } from "../state";
import type { AppNode } from "../canvas/types";
import {
  connectNodes,
  createQueryNode,
  createVarsNode,
  updateQueryNode,
  updateVarsNode,
} from "./createNodes";
import { createTextNode, updateTextNode } from "./textNodes";
import { cameraFitNode, cameraPanTo, cameraSetZoom, selectNodes } from "./viewTools";
import { createPage } from "./pageTools";

type McpRequest = { id: number; method: string; params: Record<string, unknown> };

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

function handleRequest(method: string, params: Record<string, unknown>): unknown {
  const store = getDefaultStore();
  switch (method) {
    case "connection_info": {
      const conn = store.get(activeConnectionAtom);
      if (!conn) {
        return null;
      }
      return { name: conn.connection.name, engine: engineFromUrl(conn.connection.url) };
    }
    case "db_schema":
      return store.get(schemaAtom);
    case "active_page_id":
      return { activePageId: store.get(documentAtom).activePageId };
    case "pages": {
      const doc = store.get(documentAtom);
      return doc.pageOrder.map((id, order) => ({
        id,
        name: doc.pages[id]?.name ?? "",
        order,
      }));
    }
    case "page_content": {
      const doc = store.get(documentAtom);
      const page = doc.pages[params.pageId as string];
      if (!page) {
        return null;
      }
      return { ...page, nodes: page.nodes.map(stripData) };
    }
    case "create_query_node":
      return createQueryNode(params);
    case "create_vars_node":
      return createVarsNode(params);
    case "update_query_node":
      return updateQueryNode(params);
    case "update_vars_node":
      return updateVarsNode(params);
    case "create_text_node":
      return createTextNode(params);
    case "update_text_node":
      return updateTextNode(params);
    case "connect_nodes":
      return connectNodes(params);
    case "camera_pan_to":
      return cameraPanTo(params);
    case "camera_set_zoom":
      return cameraSetZoom(params);
    case "camera_fit_node":
      return cameraFitNode(params);
    case "select_nodes":
      return selectNodes(params);
    case "create_page":
      return createPage(params);
    default:
      return null;
  }
}

// Answers host-initiated MCP requests (`mcp:request`) from the live canvas atoms
// and replies via `mcp_respond`. This is the channel the Rust MCP tools use to
// read frontend-owned state; future write-tools will dispatch through it too.
export function useMcpBridge() {
  useEffect(() => {
    const unlisten = listen<McpRequest>("mcp:request", event => {
      const { id, method, params } = event.payload;
      let result: unknown = null;
      try {
        result = handleRequest(method, params);
      } catch (error) {
        console.error("MCP request handler failed:", error);
      }
      void invoke("mcp_respond", { id, result }).catch(error =>
        console.error("mcp_respond failed:", error),
      );
    });

    return () => {
      void unlisten.then(stop => stop());
    };
  }, []);
}
