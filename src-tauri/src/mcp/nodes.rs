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

