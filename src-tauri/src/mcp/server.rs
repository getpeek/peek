//! In-process MCP server: installs the bridge, assembles the tool router,
//! applies CORS, binds, serves.

use axum::Router;
use tower_http::cors::CorsLayer;
use tower_mcp::{HttpTransport, McpRouter};

use super::bridge::SharedBridge;
use super::{connection, nodes, pages, schema, view};

/// Bind the MCP server to `0.0.0.0:port` and serve until the process exits.
pub async fn serve(port: u16, bridge: SharedBridge) -> anyhow::Result<()> {
    super::bridge::init(bridge);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    axum::serve(listener, app()).await?;

    Ok(())
}

fn app() -> Router {
    let router = McpRouter::new()
        .server_info("peek", env!("CARGO_PKG_VERSION"))
        .tool(connection::get_connection_info_tool())
        .tool(schema::get_db_schema_tool())
        .tool(pages::get_active_page_id_tool())
        .tool(pages::get_pages_tool())
        .tool(pages::get_page_content_tool())
        .tool(pages::create_page_tool())
        .tool(nodes::create_query_node_tool())
        .tool(nodes::create_vars_node_tool())
        .tool(nodes::update_query_node_tool())
        .tool(nodes::update_vars_node_tool())
        .tool(nodes::create_text_node_tool())
        .tool(nodes::update_text_node_tool())
        .tool(nodes::connect_nodes_tool())
        .tool(view::camera_pan_to_tool())
        .tool(view::camera_set_zoom_tool())
        .tool(view::camera_fit_node_tool())
        .tool(view::select_nodes_tool());

    // `disable_origin_validation` turns off the Streamable-HTTP DNS-rebinding
    // guard so agents from any origin can connect; paired with permissive CORS
    // this keeps the no-auth local server reachable without preflight friction.
    HttpTransport::new(router)
        .disable_origin_validation()
        .into_router()
        .layer(CorsLayer::permissive())
}

#[cfg(test)]
mod tests {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    use super::app;

    /// The agent-connection concern is auth/CORS. Boot the real router on an
    /// ephemeral port and send a CORS preflight; a permissive `access-control-
    /// allow-origin` proves a cross-origin agent can reach the server. (The
    /// preflight invokes no tool, so the bridge need not be installed.)
    #[tokio::test]
    async fn cors_preflight_is_permissive() {
        let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0))
            .await
            .unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app()).await.unwrap();
        });

        let mut stream = tokio::net::TcpStream::connect(addr).await.unwrap();
        let request = "OPTIONS / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Origin: http://example.com\r\n\
             Access-Control-Request-Method: POST\r\n\
             Connection: close\r\n\
             \r\n";
        stream.write_all(request.as_bytes()).await.unwrap();

        let mut response = String::new();
        stream.read_to_string(&mut response).await.unwrap();

        assert!(
            response
                .to_ascii_lowercase()
                .contains("access-control-allow-origin"),
            "preflight response missing CORS header:\n{response}"
        );
    }
}
