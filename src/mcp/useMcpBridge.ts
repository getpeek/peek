import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
import {
  getActivePageId,
  getConnectionInfo,
  getDbSchema,
  getPageContent,
  getPages,
} from "./readTools";

type McpRequest = { id: number; method: string; params: Record<string, unknown> };

function handleRequest(method: string, params: Record<string, unknown>): unknown {
  switch (method) {
    case "connection_info":
      return getConnectionInfo();
    case "db_schema":
      return getDbSchema();
    case "active_page_id":
      return getActivePageId();
    case "pages":
      return getPages();
    case "page_content":
      return getPageContent(params);
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
