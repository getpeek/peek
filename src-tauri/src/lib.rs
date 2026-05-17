pub mod config;
mod database;
mod database_commands;
mod import;
mod lsp;
mod lsp_commands;
mod multiplayer;
mod multiplayer_commands;
mod ssh_tunnel;
mod storage_commands;

use std::sync::Arc;

use config::{PeekConfig, SshTunnelConfig};
use database::{Database, mysql::MysqlDatabase, postgres::PostgresDatabase};
use lsp::{Backend, SchemaIndex};
use multiplayer::{IrohNode, MultiplayerSession};
use parking_lot::RwLock;
use sqlx::Connection;
use ssh_tunnel::SshTunnel;
use tauri::{Manager, State, async_runtime::Mutex};
use url::Url;

#[derive(Default)]
pub struct AppData {
    connection: Option<Box<dyn Database>>,
    tunnel: Option<SshTunnel>,
    pub iroh: Option<IrohNode>,
    pub session: Option<MultiplayerSession>,
}

impl std::fmt::Debug for AppData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppData")
            .field(
                "connection",
                &self.connection.as_ref().map(|_| "<dyn Database>"),
            )
            .field("tunnel", &self.tunnel)
            .field("iroh", &self.iroh)
            .field("session", &self.session)
            .finish()
    }
}

pub type SchemaCache = Arc<RwLock<SchemaIndex>>;

fn default_port_for_scheme(scheme: &str) -> Option<u16> {
    match scheme {
        "postgres" | "postgresql" => Some(5432),
        "mysql" | "mariadb" => Some(3306),
        _ => None,
    }
}

#[tauri::command]
async fn set_connection(
    state: State<'_, Mutex<AppData>>,
    schema_cache: State<'_, SchemaCache>,
    connection_string: String,
    ssh_tunnel: Option<SshTunnelConfig>,
) -> Result<(), String> {
    let mut state = state.lock().await;

    // Drop the existing connection and tunnel before opening a new one — avoids local-port
    // collision when reconnecting and ensures clean teardown order.
    state.connection.take();
    state.tunnel.take();

    let mut url =
        Url::parse(&connection_string).map_err(|e| format!("Invalid connection string: {e}"))?;

    let tunnel = if let Some(cfg) = ssh_tunnel {
        let remote_host = url
            .host_str()
            .ok_or_else(|| "Connection string missing host".to_string())?
            .to_string();
        let remote_port = url
            .port()
            .or_else(|| default_port_for_scheme(url.scheme()))
            .ok_or_else(|| format!("Cannot infer port for scheme {}", url.scheme()))?;

        let tunnel = SshTunnel::open(&cfg, &remote_host, remote_port).await?;
        let local_port = tunnel.local_port();

        url.set_host(Some("127.0.0.1"))
            .map_err(|e| format!("Failed to rewrite host: {e}"))?;
        url.set_port(Some(local_port))
            .map_err(|()| "Failed to rewrite port".to_string())?;

        Some(tunnel)
    } else {
        None
    };

    let rewritten = url.as_str().to_string();
    let scheme = url.scheme();

    if scheme == "postgres" || scheme == "postgresql" {
        let connection = sqlx::PgConnection::connect(&rewritten)
            .await
            .map_err(|e| e.to_string())?;
        let db = PostgresDatabase::new(connection);
        state.connection = Some(Box::new(db));
        state.tunnel = tunnel;
        *schema_cache.write() = SchemaIndex::default();
        return Ok(());
    }
    if scheme == "mysql" || scheme == "mariadb" {
        let db = MysqlDatabase::new(&rewritten);
        state.connection = Some(Box::new(db));
        state.tunnel = tunnel;
        *schema_cache.write() = SchemaIndex::default();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let schema_cache: SchemaCache = Arc::new(RwLock::new(SchemaIndex::default()));
    let backend = Arc::new(Backend::new(Arc::clone(&schema_cache)));

    if let Err(e) = PeekConfig::ensure_initialized_on_disk() {
        eprintln!("Failed to initialize peek settings on disk: {e}");
    }

    tauri::Builder::default()
        // Single-instance must be registered before deep-link so its `deep-link`
        // feature can forward `peek://` URLs from a duplicate launch into the
        // primary window instead of spawning a second app.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_prevent_default::init())
        .manage(Mutex::new(AppData::default()))
        .manage(schema_cache)
        .manage(backend)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            database_commands::get_results,
            database_commands::get_schema,
            database_commands::execute_statement,
            database_commands::import_file,
            storage_commands::load,
            storage_commands::save,
            storage_commands::load_results,
            storage_commands::save_results,
            config::get_config,
            config::set_theme,
            config::set_workspaces,
            lsp_commands::lsp_did_change,
            lsp_commands::lsp_completion,
            lsp_commands::lsp_set_schema_cache,
            lsp_commands::lsp_clear_schema_cache,
            lsp_commands::get_query_info,
            multiplayer_commands::mp_host_session,
            multiplayer_commands::mp_join_session,
            multiplayer_commands::mp_end_session,
            multiplayer_commands::mp_doc_put,
            multiplayer_commands::mp_doc_del,
            multiplayer_commands::mp_gossip_send,
            set_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
