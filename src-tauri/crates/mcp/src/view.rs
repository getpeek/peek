use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;
use super::reply::tool_result;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct CameraPanToInput {
    #[schemars(description = "Point to center the camera on, as [x, y] in flow coordinates.")]
    pub(crate) position: [f64; 2],
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct CameraSetZoomInput {
    #[schemars(
        description = "Zoom level; 1.0 is 100%. Clamped to the canvas range 0.1–4.0.",
        range(min = 0.1, max = 4.0)
    )]
    pub(crate) zoom: f64,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct CameraFitNodeInput {
    #[schemars(
        description = "Id of the node to bring into view. If it lives on another page the canvas \
                       switches to that page first."
    )]
    pub(crate) node_id: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct SelectNodesInput {
    #[schemars(
        description = "Ids of the nodes to select; this replaces the current selection. An empty \
                       list clears the selection. All ids should be on one page; the canvas \
                       switches to that page first."
    )]
    pub(crate) node_ids: Vec<String>,
}

#[tool_fn(
    name = "camera_pan_to",
    description = "Pan the camera to center on a point in flow coordinates, keeping the current \
                   zoom. Use coordinates from a node's position (see get_page_content)."
)]
pub(crate) async fn camera_pan_to(
    input: CameraPanToInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("camera_pan_to", json!({ "position": input.position })).await {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "camera_set_zoom",
    description = "Set the camera zoom level (1.0 = 100%), clamped to 0.1–4.0. Returns the applied \
                   zoom."
)]
pub(crate) async fn camera_set_zoom(
    input: CameraSetZoomInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("camera_set_zoom", json!({ "zoom": input.zoom })).await {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "camera_fit_node",
    description = "Bring a node into view: fit its bounds in the viewport, never zooming closer than \
                   100%. Switches to the node's page if needed. Returns { nodeId, pageId }."
)]
pub(crate) async fn camera_fit_node(
    input: CameraFitNodeInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("camera_fit_node", json!({ "nodeId": input.node_id })).await {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "select_nodes",
    description = "Select the given nodes, replacing the current selection; an empty list clears it. \
                   Switches to the nodes' page if needed. Returns { selected, pageId }."
)]
pub(crate) async fn select_nodes(
    input: SelectNodesInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("select_nodes", json!({ "nodeIds": input.node_ids })).await {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}
