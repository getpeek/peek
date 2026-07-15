use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;
use super::reply::tool_result;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct GroupNodesInput {
    #[schemars(
        description = "Id of the page the nodes are on, as returned by get_pages. Null to use the \
                       currently active page."
    )]
    pub(crate) page_id: Option<String>,
    #[schemars(
        description = "Ids of the nodes to group (at least two, all on the same page). Choose \
                       members by SEMANTIC MEANING, not mere edge connectivity — one connected \
                       graph often spans several distinct questions as an exploration drills \
                       down, and each deserves its own region."
    )]
    pub(crate) node_ids: Vec<String>,
    #[schemars(description = "Short region name shown on the canvas (2-4 words).")]
    pub(crate) name: String,
    #[schemars(description = "One-line description of what the group is about. Optional.")]
    pub(crate) desc: Option<String>,
    #[schemars(
        description = "When false the region is created confirmed. Defaults to true: the region \
                       appears as a suggestion the user reviews (Keep / Rename / Dismiss)."
    )]
    pub(crate) suggested: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct ListRegionsInput {
    #[schemars(
        description = "Id of the page to inspect, as returned by get_pages. Null to use the \
                       currently active page."
    )]
    pub(crate) page_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct AddToRegionInput {
    #[schemars(description = "Id of the region to add nodes to, as returned by list_regions.")]
    pub(crate) region_id: String,
    #[schemars(
        description = "Ids of the nodes to add. Nodes are claimed from any region that already \
                       holds them (a region emptied this way is removed)."
    )]
    pub(crate) node_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct RemoveRegionInput {
    #[schemars(description = "Id of the region to remove, as returned by group_nodes or list_regions.")]
    pub(crate) region_id: String,
}

#[tool_fn(
    name = "group_nodes",
    description = "Group nodes into a named region — a wayfinding label that shows as a beacon \
                   when the user zooms out and as an edge pointer when the group is off-screen. \
                   Group by MEANING: nodes connected by edges do not necessarily belong together, \
                   since subgraphs drift into different semantic territory as the user drills \
                   into data — prefer several precise, well-named regions over one broad one. \
                   Each node belongs to at most one region; grouping claims nodes from any region \
                   that already holds them (a region emptied this way is removed). By default the \
                   region is a suggestion the user reviews; pass suggested=false to skip review. \
                   Returns { regionId, pageId }."
)]
pub(crate) async fn group_nodes(input: GroupNodesInput) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "group_nodes",
            json!({
                "pageId": input.page_id,
                "nodeIds": input.node_ids,
                "name": input.name,
                "desc": input.desc,
                "suggested": input.suggested,
            }),
        )
        .await
        {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "list_regions",
    description = "List a page's regions and which nodes are still ungrouped. The canvas is a \
                   living document — call this first to see the current groups, then reorganize: \
                   grow a region with add_to_region, start or reshape one with group_nodes, or \
                   drop one with remove_region. Returns { pageId, regions: [{ regionId, name, \
                   desc, status, nodeIds }], ungroupedNodeIds }."
)]
pub(crate) async fn list_regions(input: ListRegionsInput) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("list_regions", json!({ "pageId": input.page_id })).await {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "add_to_region",
    description = "Add nodes to an EXISTING region without creating a new one — use this to grow a \
                   region as the canvas evolves. Each node belongs to at most one region, so the \
                   nodes are claimed from any region that already holds them (a region emptied \
                   this way is removed). The region's name, description and status are unchanged. \
                   Returns { regionId, pageId }."
)]
pub(crate) async fn add_to_region(
    input: AddToRegionInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "add_to_region",
            json!({ "regionId": input.region_id, "nodeIds": input.node_ids }),
        )
        .await
        {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "remove_region",
    description = "Delete a region by id. The member nodes are never touched — they just become \
                   ungrouped. Returns { regionId, pageId }."
)]
pub(crate) async fn remove_region(
    input: RemoveRegionInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("remove_region", json!({ "regionId": input.region_id })).await {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}
