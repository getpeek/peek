use std::collections::HashMap;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;
use super::reply::tool_result;

/// A variable's value: a single string or a list of strings, matching the
/// frontend `VariableRow.value: string | string[]`.
#[derive(Debug, Serialize, Deserialize, JsonSchema)]
#[serde(untagged)]
pub enum VarValue {
    Single(String),
    List(Vec<String>),
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct CreateQueryNodeInput {
    #[schemars(
        description = "Id of the page to place the node on, as returned by get_pages. Null to use \
                       the currently active page."
    )]
    pub page_id: Option<String>,
    #[schemars(description = "SQL query text for the node. May reference variables as @name.")]
    pub query: String,
    #[schemars(description = "Canvas position as [x, y] in flow coordinates.")]
    pub position: [f64; 2],
    #[schemars(description = "Node size as [width, height] in pixels.")]
    pub size: [f64; 2],
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct CreateVarsNodeInput {
    #[schemars(
        description = "Id of the page to place the node on, as returned by get_pages. Null to use \
                       the currently active page."
    )]
    pub page_id: Option<String>,
    #[schemars(
        description = "Map of variable name -> value. Each value is a string or a list of strings. \
                       String-y values such as strings, uuids, dates must be enclosed in single-quotes \
                       while numeric values are written plain. \
                       Names must match [A-Za-z_][A-Za-z0-9_]* and are referenced inside queries \
                       as @name."
    )]
    pub variables: HashMap<String, VarValue>,
    #[schemars(
        description = "When true the node is global: it auto-connects to every query node on the \
                       page so its variables apply everywhere without manual wiring."
    )]
    pub global: bool,
    #[schemars(description = "Canvas position as [x, y] in flow coordinates.")]
    pub position: [f64; 2],
    #[schemars(description = "Node size as [width, height] in pixels.")]
    pub size: [f64; 2],
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct UpdateQueryNodeInput {
    #[schemars(description = "Id of the query node to update, as returned by create_query_node.")]
    pub node_id: String,
    #[schemars(
        description = "New SQL query text. Omit to leave the query unchanged. May reference \
                       variables as @name."
    )]
    pub query: Option<String>,
    #[schemars(
        description = "New canvas position as [x, y] in flow coordinates. Omit to leave it where \
                       it is."
    )]
    pub position: Option<[f64; 2]>,
    #[schemars(description = "New node size as [width, height] in pixels. Omit to keep the size.")]
    pub size: Option<[f64; 2]>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct UpdateVarsNodeInput {
    #[schemars(
        description = "Id of the variable node to update, as returned by create_vars_node."
    )]
    pub node_id: String,
    #[schemars(
        description = "New map of variable name -> value, replacing the node's current variables. \
                       Each value is a string or a list of strings; names must match \
                       [A-Za-z_][A-Za-z0-9_]*. Omit to leave the variables unchanged. \
                       String-y values such as strings, uuids, dates must be enclosed in single-quotes \
                       while numeric values are written plain."
    )]
    pub variables: Option<HashMap<String, VarValue>>,
    #[schemars(
        description = "Set the global flag. Setting it true auto-connects the node to every query \
                       node on the page; setting it false leaves existing edges in place. Omit to \
                       leave the flag unchanged."
    )]
    pub global: Option<bool>,
    #[schemars(
        description = "New canvas position as [x, y] in flow coordinates. Omit to leave it where \
                       it is."
    )]
    pub position: Option<[f64; 2]>,
    #[schemars(description = "New node size as [width, height] in pixels. Omit to keep the size.")]
    pub size: Option<[f64; 2]>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct CreateTextNodeInput {
    #[schemars(
        description = "Id of the page to place the node on, as returned by get_pages. Null to use \
                       the currently active page."
    )]
    pub page_id: Option<String>,
    #[schemars(
        description = "The text to display. Rendered on a single line — newlines, not \
                              wrapping, are the only way to break it."
    )]
    pub text: String,
    #[schemars(description = "Canvas position as [x, y] in flow coordinates.")]
    pub position: [f64; 2],
    #[schemars(
        description = "Node height in pixels, which sets the font size — a tall node renders huge \
                       text, a short one renders small text. There is no width: the width is fixed \
                       to fit the text on one line, so longer text yields a wider node."
    )]
    pub height: f64,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct UpdateTextNodeInput {
    #[schemars(description = "Id of the text node to update, as returned by create_text_node.")]
    pub node_id: String,
    #[schemars(description = "New text. Omit to leave it unchanged. Rendered on a single line.")]
    pub text: Option<String>,
    #[schemars(
        description = "New canvas position as [x, y] in flow coordinates. Omit to leave it where \
                       it is."
    )]
    pub position: Option<[f64; 2]>,
    #[schemars(
        description = "New node height in pixels, which sets the font size (taller = larger text). \
                       Omit to keep the height. Width is not settable — it tracks the text."
    )]
    pub height: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct ConnectNodesInput {
    #[schemars(description = "Id of the node where the edge starts (the source).")]
    pub from: String,
    #[schemars(description = "Id of the node where the edge connects (the target).")]
    pub to: String,
}

#[tool_fn(
    name = "create_query_node",
    description = "Create a SQL Query node on the canvas at the given position and size. The page is \
                   revealed and the node is placed on it; returns { nodeId, pageId }."
)]
pub async fn create_query_node(
    input: CreateQueryNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "create_query_node",
            json!({
                "pageId": input.page_id,
                "query": input.query,
                "position": input.position,
                "size": input.size,
            }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "create_vars_node",
    description = "Create a Variable node on the canvas. A Variable node holds reusable named values \
                   — ids, timestamps, status filters, and the like — that queries reference with \
                   @name, so a value lives in one place and updates propagate to every query that \
                   uses it. Each value is a single string or a list of strings. Set global=true to \
                   apply the variables to every query node on the page automatically. Returns \
                   { nodeId, pageId }. If global is false the node can be manually connected to \
                   Other nodes by using the `connect_nodes` tool."
)]
pub async fn create_vars_node(
    input: CreateVarsNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "create_vars_node",
            json!({
                "pageId": input.page_id,
                "variables": input.variables,
                "global": input.global,
                "position": input.position,
                "size": input.size,
            }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "update_query_node",
    description = "Update an existing Query node in place, found by node_id (it can be on any \
                   page). Only the fields you pass change — omit query, position, or size to leave \
                   them as they are. Does not change the active page. Returns { nodeId, pageId }; \
                   errors when the id is unknown or names a non-query node."
)]
pub async fn update_query_node(
    input: UpdateQueryNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "update_query_node",
            json!({
                "nodeId": input.node_id,
                "query": input.query,
                "position": input.position,
                "size": input.size,
            }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "update_vars_node",
    description = "Update an existing Variable node in place, found by node_id (it can be on any \
                   page). Only the fields you pass change — omit variables, global, position, or \
                   size to leave them as they are. Passing variables replaces the whole map (empty \
                   map or an invalid name is an error). Setting global true auto-connects the node \
                   to every query on the page; setting it false leaves existing edges. Does not \
                   change the active page. Returns { nodeId, pageId }; errors when the id is \
                   unknown or names a non-variable node."
)]
pub async fn update_vars_node(
    input: UpdateVarsNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "update_vars_node",
            json!({
                "nodeId": input.node_id,
                "variables": input.variables,
                "global": input.global,
                "position": input.position,
                "size": input.size,
            }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "create_text_node",
    description = "Create a free-form Text node (a caption or label) on the canvas. The node's \
                   HEIGHT controls the font size — a tall node renders large text, a short node \
                   renders small text — so size headings tall and body labels short. Text is laid \
                   out on a single line (use newlines in the text to break it; there is no \
                   wrapping), and the width is fixed automatically to fit that text, so longer \
                   text makes a wider node. You therefore set only the text, position, and height; \
                   the width starts at 100px and grows to fit. The page is revealed and the node \
                   placed on it; returns { nodeId, pageId }; error when the page id is unknown."
)]
pub async fn create_text_node(
    input: CreateTextNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "create_text_node",
            json!({
                "pageId": input.page_id,
                "text": input.text,
                "position": input.position,
                "height": input.height,
            }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "update_text_node",
    description = "Update an existing Text node in place, found by node_id (it can be on any \
                   page). Only the fields you pass change — omit text, position, or height to \
                   leave them as they are. Remember the layout rules: height sets the font size \
                   (taller = larger text), text is single-line (newlines break it, no wrapping), \
                   and the width is not settable — it tracks the text. Does not change the active \
                   page. Returns { nodeId, pageId }; errors when the id is unknown or names a \
                   non-text node."
)]
pub async fn update_text_node(
    input: UpdateTextNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "update_text_node",
            json!({
                "nodeId": input.node_id,
                "text": input.text,
                "position": input.position,
                "height": input.height,
            }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "connect_nodes",
    description = "Create an edge from one node to another; both must exist on the same page. \
                   Connecting a variable node (from) to a query node (to) makes the variable's \
                   values available to that query as @name. Returns { edgeId, pageId }; a no-op if \
                   the edge already exists."
)]
pub async fn connect_nodes(input: ConnectNodesInput) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "connect_nodes",
            json!({ "from": input.from, "to": input.to }),
        )
        .await
        {
            Ok(v) => tool_result(v),
            Err(e) => CallToolResult::error(e),
        },
    )
}
