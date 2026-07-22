use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct SchemaInput {
    #[serde(default)]
    #[schemars(description = "Return only these tables; omit for the full schema.")]
    pub(crate) tables: Option<Vec<String>>,
}

#[tool_fn(
    name = "get_db_schema",
    description = "Active connection's schema as compact DDL, one line per table: \
                   `table(col type PK, fk_col type ->ref_table.col, ...)`. Pass `tables` to fetch \
                   only those tables; omit for the whole schema. Use it to write queries."
)]
pub(crate) async fn get_db_schema(input: SchemaInput) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("db_schema", json!({ "tables": input.tables })).await {
            Ok(schema) => CallToolResult::text(schema.as_str().unwrap_or_default().to_string()),
            Err(e) => CallToolResult::error(e),
        },
    )
}
