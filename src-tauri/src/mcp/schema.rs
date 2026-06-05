use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct NoInput {}

#[tool_fn(
    name = "get_db_schema",
    description = "Schema of the active connection as { tables, references, primaryKeys } — \
                   table columns with types, foreign-key references, and primary keys. Use it to write queries."
)]
pub async fn get_db_schema(_input: NoInput) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(match bridge::request("db_schema", json!({})).await {
        Ok(schema) => CallToolResult::text(schema.to_string()),
        Err(e) => CallToolResult::error(e),
    })
}
