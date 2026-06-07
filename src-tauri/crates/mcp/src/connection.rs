use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct NoInput {}

#[tool_fn(
    name = "get_connection_info",
    description = "Name and engine (postgresql/mysql) of the active database connection. \
                   Never returns credentials or the connection URL. Null when no connection is open."
)]
pub(crate) async fn get_connection_info(
    _input: NoInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(match bridge::request("connection_info", json!({})).await {
        Ok(info) => CallToolResult::text(info.to_string()),
        Err(e) => CallToolResult::error(e),
    })
}
