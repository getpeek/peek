import {
  connectNodes,
  createQueryNode,
  createVarsNode,
  updateQueryNode,
  updateVarsNode,
} from "../../../mcp/createNodes";
import { createTextNode, updateTextNode } from "../../../mcp/textNodes";
import { addNodesToRegion, groupNodes, listRegions, removeRegion } from "../../../mcp/regionTools";
import { cameraFitNode, cameraPanTo, cameraSetZoom, selectNodes } from "../../../mcp/viewTools";
import { createPage } from "../../../mcp/pageTools";
import {
  getActivePageId,
  getConnectionInfo,
  getDbSchema,
  getPageContent,
  getPages,
} from "../../../mcp/readTools";
import { useCanvas } from "../../hooks/useCanvas";
import { defaultDimensions } from "../../defaults";
import type { CanvasApi } from "../../state";
import type { AppNodeType } from "../../types";

// Handlers are awaited by the stream loop, so they may resolve synchronously
// (most just delegate to a synchronous mcp/* mutation) or asynchronously.
export type ToolHandler = (args: unknown) => string | Promise<string>;
export type ToolHandlers = Record<string, ToolHandler>;

type Vec = [number, number];

function describe(result: unknown): string {
  if (result && typeof result === "object" && "error" in result) {
    return `Error: ${(result as { error: unknown }).error}`;
  }
  return JSON.stringify(result);
}

export function createAgentToolHandlers(opts: { canvas: CanvasApi; nodeId: string }): ToolHandlers {
  const { canvas, nodeId } = opts;

  // Stack created nodes to the right of the agent, one row per existing
  // outgoing edge, so a multi-node build doesn't pile everything in one spot.
  const placement = (kind: AppNodeType): { position: Vec; size: Vec } => {
    const dims = defaultDimensions[kind];
    const agent = canvas.getNode(nodeId);
    if (!agent) {
      return { position: [0, 0], size: [dims.w, dims.h] };
    }
    const row = canvas.getEdges().filter(e => e.source === nodeId).length;
    const x = agent.position.x + (agent.width ?? defaultDimensions.agent.w) + 80;
    const y = agent.position.y + row * (dims.h + 40);
    return { position: [x, y], size: [dims.w, dims.h] };
  };

  return {
    create_query_node: args => {
      const a = args as { query: string; description?: string; position?: Vec; size?: Vec };
      const place = placement("query");
      const result = createQueryNode({
        query: a.query,
        description: a.description,
        position: a.position ?? place.position,
        size: a.size ?? place.size,
      });
      if ("nodeId" in result) {
        canvas.connect(nodeId, result.nodeId);
        canvas.zoomToNode(result.nodeId, { duration: 200 });
      }
      return describe(result);
    },

    create_vars_node: args => {
      const a = args as {
        variables: Record<string, string | string[]>;
        global?: boolean;
        position?: Vec;
        size?: Vec;
      };
      const place = placement("variable");
      return describe(
        createVarsNode({
          variables: a.variables,
          global: a.global ?? false,
          position: a.position ?? place.position,
          size: a.size ?? place.size,
        }),
      );
    },

    create_text_node: args => {
      const a = args as { text: string; height?: number; position?: Vec };
      const place = placement("text");
      return describe(
        createTextNode({
          text: a.text,
          height: a.height ?? place.size[1],
          position: a.position ?? place.position,
        }),
      );
    },

    create_page: args => {
      const a = args as { name: string; order?: number };
      return describe(createPage({ name: a.name, order: a.order ?? 0 }));
    },

    update_query_node: args => {
      const a = args as {
        node_id: string;
        query?: string;
        description?: string;
        position?: Vec;
        size?: Vec;
      };
      return describe(
        updateQueryNode({
          nodeId: a.node_id,
          query: a.query,
          description: a.description,
          position: a.position,
          size: a.size,
        }),
      );
    },

    update_vars_node: args => {
      const a = args as {
        node_id: string;
        variables?: Record<string, string | string[]>;
        global?: boolean;
        position?: Vec;
        size?: Vec;
      };
      return describe(
        updateVarsNode({
          nodeId: a.node_id,
          variables: a.variables,
          global: a.global,
          position: a.position,
          size: a.size,
        }),
      );
    },

    update_text_node: args => {
      const a = args as { node_id: string; text?: string; height?: number; position?: Vec };
      return describe(
        updateTextNode({ nodeId: a.node_id, text: a.text, height: a.height, position: a.position }),
      );
    },

    connect_nodes: args => {
      const a = args as { from: string; to: string };
      return describe(connectNodes({ from: a.from, to: a.to }));
    },

    group_nodes: args => {
      const a = args as { node_ids: string[]; name: string; desc?: string; suggested?: boolean };
      return describe(
        groupNodes({ nodeIds: a.node_ids, name: a.name, desc: a.desc, suggested: a.suggested }),
      );
    },

    list_regions: () => describe(listRegions({})),

    add_to_region: args => {
      const a = args as { region_id: string; node_ids: string[] };
      return describe(addNodesToRegion({ regionId: a.region_id, nodeIds: a.node_ids }));
    },

    remove_region: args =>
      describe(removeRegion({ regionId: (args as { region_id: string }).region_id })),

    camera_pan_to: args =>
      describe(cameraPanTo({ position: (args as { position: Vec }).position })),

    camera_set_zoom: args => describe(cameraSetZoom({ zoom: (args as { zoom: number }).zoom })),

    camera_fit_node: args =>
      describe(cameraFitNode({ nodeId: (args as { node_id: string }).node_id })),

    select_nodes: args =>
      describe(selectNodes({ nodeIds: (args as { node_ids: string[] }).node_ids })),

    get_db_schema: args => getDbSchema({ tables: (args as { tables?: string[] }).tables }),
    get_connection_info: () => describe(getConnectionInfo()),
    get_active_page_id: () => describe(getActivePageId()),
    get_pages: () => describe(getPages()),
    get_page_content: args =>
      describe(getPageContent({ pageId: (args as { page_id: string }).page_id })),
  };
}

export function useAgentTools(opts: { nodeId: string }): ToolHandlers {
  const canvas = useCanvas();
  return createAgentToolHandlers({ canvas, nodeId: opts.nodeId });
}
