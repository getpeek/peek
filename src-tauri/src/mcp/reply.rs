use serde_json::Value;
use tower_mcp::CallToolResult;

/// Write-tool reply convention: the frontend returns `{ error }` when it rejects
/// the request (unknown page/node, invalid input) or its result payload on
/// success. Surface the former as a tool error rather than a bare payload.
pub(super) fn tool_result(reply: Value) -> CallToolResult {
    if let Some(message) = reply.get("error").and_then(Value::as_str) {
        return CallToolResult::error(message.to_string());
    }
    CallToolResult::text(reply.to_string())
}

#[cfg(test)]
mod tests {
    use super::tool_result;
    use serde_json::json;

    #[test]
    fn error_reply_is_error() {
        assert!(tool_result(json!({ "error": "page page_x not found" })).is_error);
    }

    #[test]
    fn created_reply_is_ok() {
        assert!(!tool_result(json!({ "nodeId": "query_abc", "pageId": "page_1" })).is_error);
    }
}
