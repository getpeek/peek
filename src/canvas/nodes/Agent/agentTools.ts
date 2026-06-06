import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// These tools are bound to the model only so it knows their schemas — execution
// happens in useAgentTools' handlers (keyed by name), so the `func` here is never
// called. It exists because DynamicStructuredTool requires one.
const unused = (): Promise<string> => Promise.resolve("");

const position = z
  .tuple([z.number(), z.number()])
  .optional()
  .describe("[x, y] in flow coords; omit to auto-place next to the agent");
const size = z
  .tuple([z.number(), z.number()])
  .optional()
  .describe("[width, height] in flow coords; omit for a sensible default");
const variables = z
  .record(z.string(), z.union([z.string(), z.array(z.string())]))
  .describe("map of variable name → value (string or list of strings)");

export const AGENT_TOOLS: DynamicStructuredTool[] = [
  new DynamicStructuredTool({
    name: "run_query",
    description:
      "Execute a SQL query against the live database and get the rows back (as CSV) to analyze. Also drops a Result node on the canvas. Use this whenever you need data to answer the user.",
    schema: z.object({ query: z.string().describe("a valid PostgreSQL query to execute") }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "create_query_node",
    description:
      "Place an un-run SQL query node on the canvas for the user to run themselves. Use when the user asks you to create/write/add a query. Does NOT execute it — use run_query for that.",
    schema: z.object({ query: z.string().describe("a valid PostgreSQL query"), position, size }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "create_vars_node",
    description:
      "Create a Variable node holding reusable named values that queries reference with @name. Set global to wire it to every query on the page.",
    schema: z.object({ variables, global: z.boolean().optional(), position, size }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "create_text_node",
    description:
      "Create a free-form text caption. Its height sets the font size (tall = heading, short = small label); width auto-fits the single-line text.",
    schema: z.object({
      text: z.string(),
      height: z.number().optional().describe("font size; taller is bigger"),
      position,
    }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "create_page",
    description: "Create a new empty page and switch to it.",
    schema: z.object({
      name: z.string(),
      order: z.number().optional().describe("0-based insert position"),
    }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "update_query_node",
    description: "Edit an existing query node found by node_id. Only the fields you pass change.",
    schema: z.object({ node_id: z.string(), query: z.string().optional(), position, size }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "update_vars_node",
    description:
      "Edit an existing variable node found by node_id. Passing variables replaces the whole map; global: true auto-wires it to every query on its page.",
    schema: z.object({
      node_id: z.string(),
      variables: variables.optional(),
      global: z.boolean().optional(),
      position,
      size,
    }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "update_text_node",
    description: "Edit an existing text node found by node_id. Only the fields you pass change.",
    schema: z.object({
      node_id: z.string(),
      text: z.string().optional(),
      height: z.number().optional(),
      position,
    }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "connect_nodes",
    description:
      "Draw an edge from one node to another (both must be on the same page). E.g. attach a variable node to a query.",
    schema: z.object({ from: z.string(), to: z.string() }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "camera_pan_to",
    description: "Center the camera on a point [x, y] in flow coords, keeping the current zoom.",
    schema: z.object({ position: z.tuple([z.number(), z.number()]) }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "camera_set_zoom",
    description: "Set the camera zoom (1.0 = 100%), clamped to 0.1–4.0.",
    schema: z.object({ zoom: z.number() }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "camera_fit_node",
    description: "Frame a node by node_id, switching to its page if needed.",
    schema: z.object({ node_id: z.string() }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "select_nodes",
    description: "Replace the current selection with the given node ids (empty clears it).",
    schema: z.object({ node_ids: z.array(z.string()) }),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "get_db_schema",
    description: "Get the active connection's schema: tables, columns + types, foreign keys, PKs.",
    schema: z.object({}),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "get_connection_info",
    description:
      "Get the active connection's { name, engine }. Never returns the URL or credentials.",
    schema: z.object({}),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "get_active_page_id",
    description: "Get the id of the currently active page.",
    schema: z.object({}),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "get_pages",
    description: "List every page on the current connection as [{ id, name, order }].",
    schema: z.object({}),
    func: unused,
  }),
  new DynamicStructuredTool({
    name: "get_page_content",
    description: "Get a page's nodes/edges/viewport by page_id (embedded data rows are stripped).",
    schema: z.object({ page_id: z.string() }),
    func: unused,
  }),
];

export const AGENT_SYSTEM_PROMPT = `You are Peek's canvas agent. You help the user explore a SQL database and build on an infinite canvas of nodes.

Two query tools exist — do not confuse them:
- run_query EXECUTES a query against the live database and returns the rows (CSV) so you can analyze them; it also drops a Result node on the canvas. Use it whenever you need data to answer a question.
- create_query_node places an UN-RUN query node for the user to run themselves. Use it when the user asks you to create / write / add a query.

Other tools build and arrange the board (create_vars_node, create_text_node, create_page, update_query_node, update_vars_node, update_text_node, connect_nodes) and drive the view (camera_pan_to, camera_set_zoom, camera_fit_node, select_nodes). Read tools (get_db_schema, get_connection_info, get_active_page_id, get_pages, get_page_content) inspect the current state.

Guidance:
- The database schema is given to you as context — rely on it for table and column names rather than guessing.
- When you create a node you may omit position/size; it is placed next to you automatically.
- Prefer a direct answer or analysis over a tool call. Only use a tool when it is necessary.
- After a tool returns, use the result to answer the user. Never repeat the same tool call with the same arguments.
- Write valid PostgreSQL.`;
