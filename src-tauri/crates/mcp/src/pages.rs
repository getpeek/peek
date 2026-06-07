use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tower_mcp::{CallToolResult, tool_fn};

use super::bridge;
use super::reply::tool_result;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct NoInput {}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct PageContentInput {
    #[schemars(description = "Id of the page to fetch, as returned by get_pages.")]
    pub(crate) page_id: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub(crate) struct CreatePageInput {
    #[schemars(description = "Name for the new page.")]
    pub(crate) name: String,
    #[schemars(
        description = "Zero-based position in the page list. Clamped to the current page count \
                       (appended at the end when larger)."
    )]
    pub(crate) order: u32,
}

#[tool_fn(
    name = "get_active_page_id",
    description = "Id of the page currently selected on the canvas."
)]
pub(crate) async fn get_active_page_id(
    _input: NoInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(match bridge::request("active_page_id", json!({})).await {
        Ok(active) => CallToolResult::text(active.to_string()),
        Err(e) => CallToolResult::error(e),
    })
}

#[tool_fn(
    name = "get_pages",
    description = "All pages on the current connection as a list of { id, name, order }."
)]
pub(crate) async fn get_pages(_input: NoInput) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(match bridge::request("pages", json!({})).await {
        Ok(pages) => CallToolResult::text(pages.to_string()),
        Err(e) => CallToolResult::error(e),
    })
}

#[tool_fn(
    name = "get_page_content",
    description = "Serialized content of one page (nodes, edges, viewport). Query result rows are \
                   excluded — this never exposes database content."
)]
pub(crate) async fn get_page_content(
    input: PageContentInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request("page_content", json!({ "pageId": input.page_id })).await {
            Ok(content) => page_content_result(&content, &input.page_id),
            Err(e) => CallToolResult::error(e),
        },
    )
}

#[tool_fn(
    name = "create_page",
    description = "Create a new empty page on the current connection at the given position and \
                   switch to it. Returns the created { id, name, order }."
)]
pub(crate) async fn create_page(
    input: CreatePageInput,
) -> Result<CallToolResult, tower_mcp::Error> {
    Ok(
        match bridge::request(
            "create_page",
            json!({ "name": input.name, "order": input.order }),
        )
        .await
        {
            Ok(v) => tool_result(&v),
            Err(e) => CallToolResult::error(e),
        },
    )
}

/// An unknown page id comes back as JSON `null` from the frontend; surface that
/// as a tool error rather than handing the agent a bare `null`.
fn page_content_result(content: &Value, page_id: &str) -> CallToolResult {
    if content.is_null() {
        return CallToolResult::error(format!("page {page_id} not found"));
    }
    CallToolResult::text(content.to_string())
}

#[cfg(test)]
mod tests {
    use super::page_content_result;
    use serde_json::{Value, json};

    #[test]
    fn missing_page_is_error() {
        assert!(page_content_result(&Value::Null, "page_missing").is_error);
    }

    #[test]
    fn present_page_is_ok() {
        assert!(!page_content_result(&json!({ "id": "page_1", "nodes": [] }), "page_1").is_error);
    }
}
